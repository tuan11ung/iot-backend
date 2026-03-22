const DataSensor = require('../models/DataSensor.model');
const ActionHistory = require('../models/ActionHistory.model');
const Device = require('../models/Device.model');
const mqttClient = require('../services/mqtt.service'); // Import MQTT để điều khiển

// 1. API Lấy Dữ liệu Cảm biến
exports.getSensorsData = async (req, res) => {
    try {
// 1. Lấy các tham số từ URL (Frontend gửi lên)
        const { 
            page = 1, limit = 10, 
            sortField = 'timestamp', sortDir = 'desc',
            search, filterType, filterValue,
            fromDate, toDate,
            hour, minute, second
        } = req.query;

        // Khởi tạo bộ lọc rỗng
        const query = {};

        // 2. TÌM KIẾM TOÀN CỤC (Global Search)
        if (search) {
            const searchNum = Number(search);
            if (!isNaN(searchNum)) {
                // Nếu nhập số, tìm trong các cột nhiệt, ẩm, sáng
                query.$or = [
                    { temperature: searchNum },
                    { humidity: searchNum },
                    { light: searchNum }
                ];
            } else {
                // Lọc theo ID nếu chuỗi có đúng 24 ký tự (chuẩn _id của MongoDB)
                if (search.length === 24) {
                    query._id = search;
                }
            }
        }

        // 3. LỌC THEO CỘT CỤ THỂ (Filter Type)
        if (filterType && filterType !== 'all' && filterValue) {
            const valNum = Number(filterValue);
            if (!isNaN(valNum)) {
                if (filterType === 'temperature') query.temperature = valNum;
                if (filterType === 'humidity') query.humidity = valNum;
                if (filterType === 'light') query.light = valNum;
            }
        }

        // 4. LỌC THEO NGÀY (Date Range)
        if (fromDate || toDate) {
            query.timestamp = {};
            if (fromDate) {
                const [DD, MM, YYYY] = fromDate.split('/');
                query.timestamp.$gte = new Date(`${YYYY}-${MM}-${DD}T00:00:00.000Z`);
            }
            if (toDate) {
                const [DD, MM, YYYY] = toDate.split('/');
                query.timestamp.$lte = new Date(`${YYYY}-${MM}-${DD}T23:59:59.999Z`);
            }
        }

        // 5. LỌC THEO GIỜ/PHÚT/GIÂY (Dùng $expr nâng cao của MongoDB)
        const timeConditions = [];
        // Chú ý: MongoDB lưu giờ UTC, Việt Nam là +07:00
        if (hour) timeConditions.push({ $eq: [{ $hour: { date: "$timestamp", timezone: "+07:00" } }, Number(hour)] });
        if (minute) timeConditions.push({ $eq: [{ $minute: { date: "$timestamp", timezone: "+07:00" } }, Number(minute)] });
        if (second) timeConditions.push({ $eq: [{ $second: { date: "$timestamp", timezone: "+07:00" } }, Number(second)] });
        
        if (timeConditions.length > 0) {
            query.$expr = { $and: timeConditions };
        }

        // 6. SẮP XẾP (Sorting)
        const sortObj = {};
        // Đổi tên biến cho khớp với Database
        let dbSortField = sortField;
        if (sortField === 'id') dbSortField = '_id';
        if (sortField === 'time') dbSortField = 'timestamp';
        
        sortObj[dbSortField] = sortDir === 'asc' ? 1 : -1;

        // 7. PHÂN TRANG (Pagination)
        const skip = (Number(page) - 1) * Number(limit);

        // 8. THỰC THI TRUY VẤN
        // Đếm tổng số dòng thỏa mãn điều kiện (để Frontend làm nút bấm phân trang)
        const totalRecords = await DataSensor.countDocuments(query);
        
        // Lấy đúng số lượng dữ liệu của trang đó
        const data = await DataSensor.find(query)
            .sort(sortObj)
            .skip(skip)
            .limit(Number(limit));

        // Trả kết quả về Frontend
        res.status(200).json({
            data: data,
            pagination: {
                currentPage: Number(page),
                totalPages: Math.ceil(totalRecords / Number(limit)) || 1,
                totalRecords: totalRecords,
                itemsPerPage: Number(limit)
            }
        });
    } catch (error) {
        res.status(500).json({ message: "Lỗi Server" });
    }
};

// 2. API Lấy Lịch sử Hoạt động
exports.getActionHistory = async (req, res) => {
    try {
const { 
            page = 1, limit = 10, 
            sortField = 'requested_at', sortDir = 'desc',
            search, filterType, filterValue,
            fromDate, toDate,
            hour, minute, second
        } = req.query;

        const query = {};

        // 1. TÌM KIẾM TOÀN CỤC (Global Search)
        if (search) {
            query.$or = [
                { device_id: { $regex: search, $options: 'i' } },
                { action: { $regex: search, $options: 'i' } },
                { status: { $regex: search, $options: 'i' } }
            ];
            // Nếu search đúng 24 ký tự thì tìm theo ID
            if (search.length === 24) query._id = search;
        }

        // 2. LỌC THEO CỘT CỤ THỂ
        if (filterType && filterType !== 'all' && filterValue) {
            if (filterType === 'device') query.device_id = { $regex: filterValue, $options: 'i' };
            if (filterType === 'action') query.action = { $regex: filterValue, $options: 'i' };
            if (filterType === 'status') query.status = { $regex: filterValue, $options: 'i' };
        }

        // 3. LỌC THEO NGÀY
        if (fromDate || toDate) {
            query.requested_at = {};
            if (fromDate) {
                const [DD, MM, YYYY] = fromDate.split('/');
                query.requested_at.$gte = new Date(`${YYYY}-${MM}-${DD}T00:00:00.000Z`);
            }
            if (toDate) {
                const [DD, MM, YYYY] = toDate.split('/');
                query.requested_at.$lte = new Date(`${YYYY}-${MM}-${DD}T23:59:59.999Z`);
            }
        }

        // 4. LỌC THEO THỜI GIAN (Giờ/Phút/Giây)
        const timeConditions = [];
        if (hour) timeConditions.push({ $eq: [{ $hour: { date: "$requested_at", timezone: "+07:00" } }, Number(hour)] });
        if (minute) timeConditions.push({ $eq: [{ $minute: { date: "$requested_at", timezone: "+07:00" } }, Number(minute)] });
        if (second) timeConditions.push({ $eq: [{ $second: { date: "$requested_at", timezone: "+07:00" } }, Number(second)] });
        
        if (timeConditions.length > 0) {
            query.$expr = { $and: timeConditions };
        }

        // 5. SẮP XẾP
        const sortObj = {};
        let dbSortField = sortField;
        if (sortField === 'id') dbSortField = '_id';
        if (sortField === 'device') dbSortField = 'device_id';
        if (sortField === 'time') dbSortField = 'requested_at';
        
        sortObj[dbSortField] = sortDir === 'asc' ? 1 : -1;

        // 6. PHÂN TRANG VÀ TRẢ KẾT QUẢ
        const skip = (Number(page) - 1) * Number(limit);
        const totalRecords = await ActionHistory.countDocuments(query);
        const data = await ActionHistory.find(query)
            .sort(sortObj)
            .skip(skip)
            .limit(Number(limit));

        res.status(200).json({
            data: data,
            pagination: {
                currentPage: Number(page),
                totalPages: Math.ceil(totalRecords / Number(limit)) || 1,
                totalRecords: totalRecords
            }
        });
    } catch (error) {
        res.status(500).json({ message: "Lỗi Server" });
    }
};

// 3. API Gửi lệnh điều khiển
exports.controlDevice = async (req, res) => {
    const { device_id, action } = req.body; 
    if (!action || !device_id) return res.status(400).json({ message: "Thiếu dữ liệu điều khiển" });

    try {
        // 1. Tìm trạng thái cũ để lưu lịch sử
        const device = await Device.findOne({ name: device_id });
        const oldState = device ? device.current_state : "UNKNOWN";

        // 2. Tạo bản ghi trạng thái "Pending"
        const newAction = new ActionHistory({
            device_id: device_id, 
            action: action, 
            status: "Pending", 
            old_state: oldState, 
            requested_at: new Date()
        });
        await newAction.save();

        // 3. Publish lệnh xuống mạch ESP32 qua MQTT
        mqttClient.publish('tuan11ung/control', action);
        
        // 4. BỘ ĐẾM NGƯỢC TIMEOUT (10 Giây)
        setTimeout(async () => {
            try {
                // Sau 10s, tìm lại đúng bản ghi lệnh vừa tạo
                const checkAction = await ActionHistory.findById(newAction._id);
                
                // Nếu nó VẪN CÒN là "Pending" -> Nghĩa là mạch ESP32 không thèm trả lời
                if (checkAction && checkAction.status === "Pending") {
                    checkAction.status = "Failed"; // Đổi thành Failed (hoặc Timeout)
                    await checkAction.save();
                    console.log(`⏰ Lệnh [${action}] đã bị Timeout (Quá 10s). Đã chốt thành Failed!`);
                }
            } catch (err) {
                console.error("Lỗi khi kiểm tra Timeout:", err);
            }
        }, 10000); // 10000 milliseconds = 10 giây

        // Trả kết quả ngay cho Frontend để Frontend quay vòng loading
        res.status(200).json({ message: "Đã gửi lệnh xuống mạch", data: newAction });

    } catch (error) {
        console.error("Lỗi API Control:", error);
        res.status(500).json({ message: "Lỗi server nội bộ" });
    }
};