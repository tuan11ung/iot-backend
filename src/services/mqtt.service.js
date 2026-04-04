// File: services/mqttService.js
const mqtt = require('mqtt');
const Device = require('../models/Device.model');
const DataSensor = require('../models/DataSensor.model');
const ActionHistory = require('../models/ActionHistory.model');
const Sensor = require('../models/Sensor.model');

const mqttOptions = { clientId: 'NodeJS_Backend_' + Math.random().toString(16).slice(2, 8) };
if (process.env.MQTT_USER && process.env.MQTT_PASS) {
    mqttOptions.username = process.env.MQTT_USER;
    mqttOptions.password = process.env.MQTT_PASS;
}

// Kết nối
const client = mqtt.connect(`${process.env.MQTT_BROKER}:${process.env.MQTT_PORT}`, mqttOptions);

client.on('connect', () => {
    console.log('🟢 Backend đã kết nối MQTT Broker');
    client.subscribe('tuan11ung/sensor_data');
    client.subscribe('tuan11ung/response');
});

// Xử lý logic khi có tin nhắn đến
client.on('message', async (topic, message) => {
    try {
        const payload = JSON.parse(message.toString());

        if (topic === 'tuan11ung/sensor_data') {
            // 1. Tự động tìm (hoặc tạo mới nếu chưa có) 3 cảm biến trong bảng Sensor
            const tempSensor = await Sensor.findOneAndUpdate({ name: 'Nhiệt độ' }, { sensor_type: 'DHT11' }, { upsert: true, returnDocument: 'after' });
            const humiSensor = await Sensor.findOneAndUpdate({ name: 'Độ ẩm' }, { sensor_type: 'DHT11' }, { upsert: true, returnDocument: 'after' });
            const luxSensor = await Sensor.findOneAndUpdate({ name: 'Ánh sáng' }, { sensor_type: 'LDR' }, { upsert: true, returnDocument: 'after' });

            // 2. Lưu 3 bản ghi rời rạc vào bảng DATA_SENSOR
            await DataSensor.insertMany([
                { sensor_id: tempSensor._id, value: payload.temp },
                { sensor_id: humiSensor._id, value: payload.humi },
                { sensor_id: luxSensor._id, value: payload.lux }
            ]);
            
        }
        else if (topic === 'tuan11ung/response') {
            const pendingAction = await ActionHistory.findOneAndUpdate(
                { action: payload.command, status: "Pending" }, 
                { 
                    status: payload.status === "success" ? "Success" : "Failed",
                    new_state: payload.command.includes("ON") ? "ON" : (payload.command.includes("OFF") ? "OFF" : "OTHER"),
                    executed_at: new Date()
                },
                { sort: { requested_at: -1 }, new: true }
            );

            if (pendingAction) {
                console.log(`✅ Lệnh [${payload.command}] đã thực thi xong`);
                await Device.findOneAndUpdate(
                    { name: pendingAction.device_id },
                    { current_state: pendingAction.new_state, last_updated: new Date() },
                    { upsert: true }
                );
            }
        }
    } catch (error) {
        console.error('❌ Lỗi xử lý MQTT:', error.message);
    }
});

// Xuất client ra để các Controller khác có thể dùng lệnh publish
module.exports = client;