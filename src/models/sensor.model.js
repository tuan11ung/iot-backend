import mongoose from "mongoose";

const sensorSchema = new mongoose.Schema({
    temperature: { type: Number, required: true },
    humidity: { type: Number, required: true },
    lightLux: { type: Number, required: true },
    createdAt: { type: Date, default: Date.now } // Tự động lưu thời gian hiện tại
});

export default mongoose.model('Sensor', sensorSchema);