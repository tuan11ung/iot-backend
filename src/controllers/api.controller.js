const DataSensor = require('../models/DataSensor.model');
const ActionHistory = require('../models/ActionHistory.model');
const Device = require('../models/Device.model');
const mqttClient = require('../services/mqtt.service'); // Import MQTT để điều khiển

// 1. API Lấy Dữ liệu Cảm biến
exports.getSensorsData = async (req, res) => {
    try {
        const { page = 1, limit = 10, sortField = 'timestamp', sortDir = 'desc', sensorType, searchBy, search } = req.query;

        // 1. Dùng Aggregate để JOIN bảng DataSensor với bảng Sensor
        let pipeline = [
            {
                $lookup: {
                    from: "sensors", // Tên collection trong MongoDB
                    localField: "sensor_id",
                    foreignField: "_id",
                    as: "sensor_info"
                }
            },
            { $unwind: "$sensor_info" } // Gỡ mảng sau khi JOIN
        ];

        // 2. Lọc theo Loại Cảm biến (Dropdown filter)
        let matchStage = {};
        if (sensorType && sensorType !== 'all') {
            if (sensorType === 'Temperature') matchStage['sensor_info.name'] = { $regex: /nhiệt độ/i };
            if (sensorType === 'Humidity') matchStage['sensor_info.name'] = { $regex: /độ ẩm/i };
            if (sensorType === 'Light') matchStage['sensor_info.name'] = { $regex: /ánh sáng/i };
        }

        // 3. Tìm kiếm theo Giá trị hoặc Thời gian
        if (search) {
            if (searchBy === 'value') {
                const val = Number(search);
                if (!isNaN(val)) matchStage.value = val;
            } else if (searchBy === 'time') {
                // FORMAT CHUẨN: %d/%m/%Y %H:%M:%S (Ví dụ: 04/04/2026 01:01:45)
                // regex: search sẽ tự động khớp (match) với bất kỳ đoạn nào (2026, 04/04/2026,...)
                matchStage.$expr = {
                    $regexMatch: {
                        input: { 
                            $dateToString: { 
                                format: "%d/%m/%Y %H:%M:%S", 
                                date: "$timestamp", // Lưu ý: Nếu ở bảng History thì đổi "$timestamp" thành "$requested_at"
                                timezone: "+07:00" 
                            } 
                        },
                        regex: search,
                        options: "i"
                    }
                };
            }
        }

        if (Object.keys(matchStage).length > 0) pipeline.push({ $match: matchStage });

        // 4. Sắp xếp (Sort)
        let sortStage = {};
        const sDir = sortDir === 'asc' ? 1 : -1;
        if (sortField === 'sensor_name') sortStage['sensor_info.name'] = sDir;
        else sortStage[sortField === 'time' ? 'timestamp' : sortField] = sDir;
        pipeline.push({ $sort: sortStage });

        // 5. Phân trang (Pagination)
        const skip = (Number(page) - 1) * Number(limit);
        pipeline.push({
            $facet: {
                metadata: [{ $count: "total" }],
                data: [{ $skip: skip }, { $limit: Number(limit) }]
            }
        });

        // THỰC THI TRUY VẤN
        const result = await DataSensor.aggregate(pipeline);

        // FORMAT KẾT QUẢ TRẢ VỀ FRONTEND
        const totalRecords = result[0].metadata.length > 0 ? result[0].metadata[0].total : 0;
        const data = result[0].data.map(item => ({
            _id: item._id,
            sensor_name: item.sensor_info.name, // Lấy tên từ bảng Sensor
            value: item.value,
            timestamp: item.timestamp
        }));

        res.status(200).json({
            data: data,
            pagination: {
                currentPage: Number(page),
                totalPages: Math.ceil(totalRecords / Number(limit)) || 1,
                totalRecords: totalRecords
            }
        });

    } catch (error) {
        console.error("Lỗi getSensorsData:", error);
        res.status(500).json({ message: "Lỗi Server Nội Bộ" });
    }
};

// 2. API Lấy Lịch sử Hoạt động
exports.getActionHistory = async (req, res) => {
    try {
        const { 
            page = 1, limit = 10, 
            sortField = 'requested_at', sortDir = 'desc',
            filterDevice, searchBy, search 
        } = req.query;

        let query = {};

        // 1. Lọc theo Thiết bị (FAN, AC, LIGHT)
        if (filterDevice && filterDevice !== 'all') {
            query.device_id = filterDevice;
        }

        // 2. Tìm kiếm (Theo Thông tin hoặc Thời gian)
        if (search) {
            if (searchBy === 'info') {
                // Tìm trong các trường dạng chuỗi
                let orConditions = [
                    { action: { $regex: search, $options: 'i' } },
                    { status: { $regex: search, $options: 'i' } },
                    { device_id: { $regex: search, $options: 'i' } }
                ];
                // Nếu search dài 24 ký tự (chuẩn ID của MongoDB) thì tìm thêm theo ID
                if (search.length === 24) {
                    orConditions.push({ _id: search });
                }
                query.$or = orConditions;
                
            } else if (searchBy === 'time') {
                // FORMAT CHUẨN TÌM KIẾM: DD/MM/YYYY HH:MM:SS
                query.$expr = {
                    $regexMatch: {
                        input: { 
                            $dateToString: { 
                                format: "%d/%m/%Y %H:%M:%S", 
                                date: "$requested_at", 
                                timezone: "+07:00" 
                            } 
                        },
                        regex: search,
                        options: "i"
                    }
                };
            }
        }

        // 3. Sắp xếp
        const sortObj = {};
        sortObj[sortField] = sortDir === 'asc' ? 1 : -1;

        // 4. Phân trang
        const totalRecords = await ActionHistory.countDocuments(query);
        const skip = (Number(page) - 1) * Number(limit);

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
        console.error("Lỗi getActionHistory:", error);
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