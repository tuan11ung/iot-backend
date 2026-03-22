import dotenv from 'dotenv';
import mqtt from 'mqtt';
import mongoose from 'mongoose';

// Kích hoạt thư viện đọc file .env
dotenv.config(); 

// Nhúng 2 Model Database (Lưu ý: Bắt buộc phải thêm đuôi .js)
import Sensor from './models/sensor.model.js';
import History from './models/history.model.js';
// ==========================================
// 1. KẾT NỐI MONGODB TỪ FILE .ENV
// ==========================================
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log('🟢 Đã kết nối thành công tới MongoDB'))
    .catch(err => console.error('🔴 Lỗi kết nối MongoDB:', err));

// ==========================================
// 2. KẾT NỐI MQTT TỪ FILE .ENV
// ==========================================
const mqttOptions = {
    clientId: 'NodeJS_Backend_' + Math.random().toString(16).slice(2, 8),
};

// Chỉ thêm User/Pass nếu trong file .env có khai báo (Dành cho mạch thật sau này)
if (process.env.MQTT_USER && process.env.MQTT_PASS) {
    mqttOptions.username = process.env.MQTT_USER;
    mqttOptions.password = process.env.MQTT_PASS;
}

// Lấy địa chỉ IP và Port từ file .env
const brokerUrl = `${process.env.MQTT_BROKER}:${process.env.MQTT_PORT}`;
const client = mqtt.connect(brokerUrl, mqttOptions);

client.on('connect', () => {
    console.log(`🟢 Backend đã kết nối MQTT tại: ${brokerUrl}`);
    
    // Đăng ký lắng nghe đúng topic của bạn
    client.subscribe('tuan11ung/sensor_data');
    client.subscribe('tuan11ung/response');
});

// ==========================================
// 3. XỬ LÝ DỮ LIỆU ĐẾN & LƯU VÀO DATABASE
// ==========================================
client.on('message', async (topic, message) => {
    try {
        const payload = JSON.parse(message.toString());

        // 3.1 Lưu dữ liệu cảm biến
        if (topic === 'tuan11ung/sensor_data') {
            console.log(`🌡️ Cảm biến: Nhiệt độ ${payload.temp}°C, Độ ẩm ${payload.humi}%, AS: ${payload.lux} lux`);
            
            const newSensorData = new Sensor({
                temperature: payload.temp,
                humidity: payload.humi,
                lightLux: payload.lux
            });
            await newSensorData.save();
        }

        // 3.2 Lưu dữ liệu lịch sử phản hồi
        else if (topic === 'tuan11ung/response') {
            console.log(`💡 Lịch sử: Lệnh [${payload.command}] - Trạng thái: [${payload.led_temp}, ${payload.led_humi}, ${payload.led_light}]`);
            
            const newHistoryData = new History({
                device: payload.device,
                command: payload.command,
                status: payload.status,
                led_temp: payload.led_temp,
                led_humi: payload.led_humi,
                led_light: payload.led_light
            });
            await newHistoryData.save();
        }

    } catch (error) {
        console.error('❌ Lỗi xử lý JSON hoặc lưu DB:', error.message);
    }
});