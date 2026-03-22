const mongoose = require('mongoose');

const dataSensorSchema = new mongoose.Schema({
    // Đã gộp 3 chỉ số vào 1 dòng theo đúng ERD
    temperature: { type: Number, required: true }, // °C
    humidity: { type: Number, required: true },    // %
    light: { type: Number, required: true },       // lux
    timestamp: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Data_Sensor', dataSensorSchema);