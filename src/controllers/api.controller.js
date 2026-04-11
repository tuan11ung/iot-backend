// File: controllers/apiController.js
const { Op } = require('sequelize');
const { sequelize } = require('../configs/db');
const DataSensor = require('../models/DataSensor.model');
const Sensor = require('../models/Sensor.model');
const ActionHistory = require('../models/ActionHistory.model');
const Device = require('../models/Device.model');
const mqttClient = require('../services/mqtt.service');

// =========================================================================
// 1. API LẤY DỮ LIỆU CẢM BIẾN (DATA SENSOR)
// =========================================================================
exports.getSensorsData = async (req, res) => {
    try {
        const { page = 1, limit = 10, sortField = 'timestamp', sortDir = 'desc', sensorType, searchBy, search } = req.query;

        let whereCondition = {};
        let sensorWhere = {};

        // A. Lọc theo Loại Cảm biến (JOIN BẢNG)
        if (sensorType && sensorType !== 'all') {
            if (sensorType === 'Temperature') sensorWhere.name = { [Op.iLike]: '%nhiệt độ%' };
            if (sensorType === 'Humidity') sensorWhere.name = { [Op.iLike]: '%độ ẩm%' };
            if (sensorType === 'Light') sensorWhere.name = { [Op.iLike]: '%ánh sáng%' };
        }

        // B. Tìm kiếm theo Giá trị hoặc Thời gian
        if (search) {
            if (searchBy === 'value') {
                const val = Number(search);
                if (!isNaN(val)) whereCondition.value = val;
            } else if (searchBy === 'time') {
                // PostgeSQL: Ép kiểu ngày tháng sang chuỗi DD/MM/YYYY HH24:MI:SS để tìm kiếm
                whereCondition = sequelize.where(
                    sequelize.fn('to_char', sequelize.col('DataSensor.timestamp'), 'DD/MM/YYYY HH24:MI:SS'),
                    { [Op.iLike]: `%${search}%` }
                );
            }
        }

        // C. Sắp xếp (Sort)
        let orderClause = [];
        if (sortField === 'sensor_name') {
            orderClause = [[Sensor, 'name', sortDir]]; // Sort theo bảng JOIN
        } else {
            const dbSortField = sortField === 'time' ? 'timestamp' : sortField;
            orderClause = [[dbSortField, sortDir]];
        }

        // D. Truy vấn Database
        const offset = (Number(page) - 1) * Number(limit);
        const { count, rows } = await DataSensor.findAndCountAll({
            where: whereCondition,
            include: [{
                model: Sensor,
                where: sensorWhere,
                attributes: ['name']
            }],
            order: orderClause,
            limit: Number(limit),
            offset: offset
        });

        // E. Format kết quả trả về Frontend
        const formattedData = rows.map(item => ({
            _id: item.id.toString(), // Chuyển ID số sang chuỗi để Frontend không bị lỗi
            sensor_name: item.Sensor ? item.Sensor.name : "Unknown",
            value: Number(item.value),
            timestamp: item.timestamp
        }));

        res.status(200).json({
            data: formattedData,
            pagination: {
                currentPage: Number(page),
                totalPages: Math.ceil(count / Number(limit)) || 1,
                totalRecords: count
            }
        });

    } catch (error) {
        console.error("Lỗi getSensorsData:", error);
        res.status(500).json({ message: "Lỗi Server Nội Bộ" });
    }
};

// =========================================================================
// 2. API LẤY LỊCH SỬ HÀNH ĐỘNG (ACTION HISTORY)
// =========================================================================
exports.getActionHistory = async (req, res) => {
    try {
        const { page = 1, limit = 10, sortField = 'requested_at', sortDir = 'desc', filterDevice, searchBy, search } = req.query;

        let whereCondition = {};

        // A. Lọc theo Thiết bị
        if (filterDevice && filterDevice !== 'all') {
            whereCondition.device_id = filterDevice;
        }

        // B. Tìm kiếm
        if (search) {
            if (searchBy === 'info') {
                let orConditions = [
                    // 👉 ÉP KIỂU ENUM SANG VARCHAR ĐỂ TÌM KIẾM BẰNG iLike
                    sequelize.where(sequelize.cast(sequelize.col('action'), 'varchar'), { [Op.iLike]: `%${search}%` }),
                    sequelize.where(sequelize.cast(sequelize.col('status'), 'varchar'), { [Op.iLike]: `%${search}%` }),

                    // device_id vốn là VARCHAR rồi nên tìm kiếm bình thường
                    { device_id: { [Op.iLike]: `%${search}%` } }
                ];

                // Nếu người dùng nhập số, cho phép tìm theo ID luôn
                const searchNum = parseInt(search, 10);
                if (!isNaN(searchNum)) {
                    orConditions.push({ id: searchNum });
                }
                whereCondition[Op.or] = orConditions;

            } else if (searchBy === 'time') {
                whereCondition = sequelize.where(
                    sequelize.fn('to_char', sequelize.col('requested_at'), 'DD/MM/YYYY HH24:MI:SS'),
                    { [Op.iLike]: `%${search}%` }
                );
            }
        }

        // C. Sắp xếp
        const dbSortField = sortField === 'time' ? 'requested_at' : sortField;
        const orderClause = [[dbSortField, sortDir]];

        // D. Truy vấn
        const offset = (Number(page) - 1) * Number(limit);
        const { count, rows } = await ActionHistory.findAndCountAll({
            where: whereCondition,
            order: orderClause,
            limit: Number(limit),
            offset: offset
        });

        // E. Format kết quả trả về Frontend
        const formattedData = rows.map(item => ({
            _id: item.id.toString(),
            device_id: item.device_id,
            action: item.action,
            status: item.status,
            requested_at: item.requested_at
        }));

        res.status(200).json({
            data: formattedData,
            pagination: {
                currentPage: Number(page),
                totalPages: Math.ceil(count / Number(limit)) || 1,
                totalRecords: count
            }
        });

    } catch (error) {
        console.error("Lỗi getActionHistory:", error);
        res.status(500).json({ message: "Lỗi Server Nội Bộ" });
    }
};

// =========================================================================
// 3. API ĐIỀU KHIỂN THIẾT BỊ (CÓ TIMEOUT 10s)
// =========================================================================
exports.controlDevice = async (req, res) => {
    const { device_id, action } = req.body;
    if (!action || !device_id) return res.status(400).json({ message: "Thiếu dữ liệu điều khiển" });

    try {
        // 1. Tìm trạng thái cũ của thiết bị
        const device = await Device.findOne({ where: { name: device_id } });
        const oldState = device ? device.current_state : "NULL";

        // 👉 XỬ LÝ LỖI ENUM: Lọc ra chữ "ON" hoặc "OFF" từ lệnh gửi lên (VD: "FAN_ON" -> "ON")
        const actionEnum = action.toUpperCase().includes("ON") ? "ON" : "OFF";

        // 2. Tạo bản ghi trạng thái "Pending"
        const newAction = await ActionHistory.create({
            device_id: device_id,
            action: actionEnum,  // Lưu "ON" hoặc "OFF" vào PostgreSQL để không bị lỗi ENUM
            status: "Pending",
            old_state: oldState,
            requested_at: new Date()
        });

        // 3. Publish lệnh nguyên gốc (VD: "FAN_ON") xuống mạch ESP32
        mqttClient.publish('tuan11ung/control', action);

        // 4. BỘ ĐẾM NGƯỢC TIMEOUT (10 Giây)
        setTimeout(async () => {
            try {
                // Sau 10s, tìm lại đúng bản ghi lệnh vừa tạo bằng ID
                const checkAction = await ActionHistory.findByPk(newAction.id);

                // Nếu nó VẪN CÒN là "Pending" -> Mạch ESP32 không trả lời
                if (checkAction && checkAction.status === "Pending") {
                    checkAction.status = "Failed";
                    await checkAction.save();
                    console.log(`⏰ Lệnh ID [${newAction.id} - ${action}] đã bị Timeout (Quá 10s). Đã chốt thành Failed!`);
                }
            } catch (err) {
                console.error("Lỗi khi kiểm tra Timeout:", err);
            }
        }, 10000); // 10 giây

        // 5. Trả kết quả ngay cho Frontend (fake _id để frontend map đúng)
        const responseData = newAction.toJSON();
        responseData._id = responseData.id.toString();

        res.status(200).json({ message: "Đã gửi lệnh xuống mạch", data: responseData });

    } catch (error) {
        console.error("Lỗi API Control:", error);
        res.status(500).json({ message: "Lỗi server nội bộ" });
    }
};