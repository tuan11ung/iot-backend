const mongoose = require('mongoose');

const sensorSchema = new mongoose.Schema({
    name: { type: String, required: true }, // "Nhiệt độ", "Độ ẩm", "Ánh sáng"
    sensor_type: { type: String },          // "DHT22", "LDR", ...
    is_active: { type: Boolean, default: true }
}, { timestamps: { createdAt: 'created_at', updatedAt: false } });

module.exports = mongoose.model('Sensor', sensorSchema);