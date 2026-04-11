// File: services/mqttService.js
const mqtt = require('mqtt');
const { Op } = require('sequelize');

// IMPORT 4 MODELS CỦA SEQUELIZE
const Device = require('../models/Device.model');
const Sensor = require('../models/Sensor.model');
const DataSensor = require('../models/DataSensor.model');
const ActionHistory = require('../models/ActionHistory.model');

// ==========================================================
// 1. CẤU HÌNH KẾT NỐI MQTT BROKER
// ==========================================================
const mqttOptions = {
    clientId: 'NodeJS_Backend_' + Math.random().toString(16).slice(2, 8)
};

// Nếu có tài khoản mật khẩu trong .env thì thêm vào
if (process.env.MQTT_USER && process.env.MQTT_PASS) {
    mqttOptions.username = process.env.MQTT_USER;
    mqttOptions.password = process.env.MQTT_PASS;
}

const client = mqtt.connect(`${process.env.MQTT_BROKER}:${process.env.MQTT_PORT}`, mqttOptions);

client.on('error', (err) => {
    console.error('🔴 Lỗi kết nối MQTT (Sai IP, sai Port hoặc sai User/Pass):', err.message);
});

client.on('offline', () => {
    console.log('🟡 MQTT đang bị ngắt kết nối. Đang thử kết nối lại...');
});

client.on('connect', () => {
    console.log('🟢 Backend đã kết nối MQTT Broker thành công!');
    // Đăng ký nhận 2 luồng dữ liệu từ mạch ESP32
    client.subscribe('tuan11ung/sensor_data');
    client.subscribe('tuan11ung/response');
});

// ==========================================================
// 2. LẮNG NGHE & XỬ LÝ DỮ LIỆU (EVENT: 'message')
// ==========================================================
client.on('message', async (topic, message) => {
    try {
        const payload = JSON.parse(message.toString());

        // --------------------------------------------------
        // A. LUỒNG 1: DỮ LIỆU CẢM BIẾN (Chạy mỗi 2 giây)
        // --------------------------------------------------
        if (topic === 'tuan11ung/sensor_data') {
            // 1. Sequelize: Tìm cảm biến (nếu chưa có thì tự động tạo mới vào bảng Sensor)
            const [tempSensor] = await Sensor.findOrCreate({
                where: { name: 'Nhiệt độ' },
                defaults: { sensor_type: 'DHT22', is_active: true }
            });
            const [humiSensor] = await Sensor.findOrCreate({
                where: { name: 'Độ ẩm' },
                defaults: { sensor_type: 'DHT22', is_active: true }
            });
            const [luxSensor] = await Sensor.findOrCreate({
                where: { name: 'Ánh sáng' },
                defaults: { sensor_type: 'LDR', is_active: true }
            });

            // 2. Sequelize: Chèn 1 lúc 3 bản ghi riêng biệt vào bảng DataSensor
            await DataSensor.bulkCreate([
                { sensor_id: tempSensor.id, value: payload.temp },
                { sensor_id: humiSensor.id, value: payload.humi },
                { sensor_id: luxSensor.id, value: payload.lux }
            ]);
        }

        // --------------------------------------------------
        // B. LUỒNG 2: PHẢN HỒI LỆNH ĐIỀU KHIỂN
        // VD ESP32 gửi lên: { "command": "FAN_ON", "status": "success" }
        // --------------------------------------------------
        else if (topic === 'tuan11ung/response') {

            // 👉 SỬA LỖI ENUM Ở ĐÂY: Tách "FAN_ON" thành thiết bị "FAN" và lệnh "ON"
            const actionEnum = payload.command.includes("ON") ? "ON" : "OFF";
            const deviceName = payload.command.split('_')[0]; // Lấy chữ "FAN" ở trước dấu gạch dưới

            // 1. Tìm bản ghi "Pending" mới nhất (Tìm chuẩn theo device và actionEnum)
            const pendingAction = await ActionHistory.findOne({
                where: {
                    device_id: deviceName,
                    action: actionEnum,
                    status: 'Pending'
                },
                order: [['requested_at', 'DESC']]
            });

            if (pendingAction) {
                // 2. Cập nhật kết quả thành Success hoặc Failed
                const isSuccess = payload.status === "success";
                pendingAction.status = isSuccess ? "Success" : "Failed";

                pendingAction.new_state = actionEnum; // Dùng luôn actionEnum cho gọn
                pendingAction.executed_at = new Date();

                await pendingAction.save(); // Lưu vào DB

                console.log(`✅ Lệnh [${payload.command}] đã thực thi xong. Trạng thái: ${pendingAction.status}`);

                // 3. Cập nhật trạng thái hiện tại (current_state) vào bảng Device
                let device = await Device.findOne({ where: { name: pendingAction.device_id } });

                if (!device) {
                    await Device.create({
                        name: pendingAction.device_id,
                        type: pendingAction.device_id,
                        current_state: pendingAction.new_state,
                        last_updated: new Date()
                    });
                } else {
                    device.current_state = pendingAction.new_state;
                    device.last_updated = new Date();
                    await device.save();
                }
            }
        }
    } catch (error) {
        console.error('❌ Lỗi xử lý dữ liệu MQTT:', error.message);
    }
});

// Xuất cái client này ra để bên Controller dùng nó Publish lệnh điều khiển (POST /api/control)
module.exports = client;