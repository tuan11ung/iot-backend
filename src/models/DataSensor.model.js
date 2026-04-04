const mongoose = require('mongoose');

const dataSensorSchema = new mongoose.Schema({
    // Nối với bảng Sensor bằng khóa ngoại (Foreign Key)
    sensor_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Sensor', required: true },
    value: { type: Number, required: true },
    timestamp: { type: Date, default: Date.now }
});

module.exports = mongoose.model('DataSensor', dataSensorSchema);