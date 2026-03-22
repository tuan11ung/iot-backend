const DataSensor = require('../models/DataSensor.model');
const ActionHistory = require('../models/ActionHistory.model');
const Device = require('../models/Device.model');
const mqttClient = require('../services/mqtt.service'); // Import MQTT để điều khiển

// 1. API Lấy Dữ liệu Cảm biến
exports.getSensorsData = async (req, res) => {
    try {
        // (Bạn hãy copy toàn bộ phần logic req.query, search, filter, sort, phân trang... 
        // của API get('/api/sensors/data') ở file server.js cũ paste vào đây)
        
        // Code rút gọn ví dụ:
        const { page = 1, limit = 10 } = req.query;
        const data = await DataSensor.find().sort({ timestamp: -1 }).limit(Number(limit));
        res.status(200).json({ data, pagination: { currentPage: page } });
    } catch (error) {
        res.status(500).json({ message: "Lỗi Server" });
    }
};

// 2. API Lấy Lịch sử Hoạt động
exports.getActionHistory = async (req, res) => {
    try {
        // (Copy toàn bộ logic filter, sort, phân trang của API get('/api/history') cũ vào đây)
        const data = await ActionHistory.find().sort({ requested_at: -1 }).limit(10);
        res.status(200).json({ data });
    } catch (error) {
        res.status(500).json({ message: "Lỗi Server" });
    }
};

// 3. API Gửi lệnh điều khiển
exports.controlDevice = async (req, res) => {
    const { device_id, action } = req.body; 
    if (!action || !device_id) return res.status(400).json({ message: "Thiếu data" });

    try {
        const device = await Device.findOne({ name: device_id });
        const oldState = device ? device.current_state : "UNKNOWN";

        const newAction = new ActionHistory({
            device_id, action, status: "Pending", old_state: oldState, requested_at: new Date()
        });
        await newAction.save();

        // Dùng mqttClient đã import từ service để publish
        mqttClient.publish('tuan11ung/control', action);
        
        res.status(200).json({ message: "Đã gửi lệnh", data: newAction });
    } catch (error) {
        res.status(500).json({ message: "Lỗi server" });
    }
};