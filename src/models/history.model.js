import mongoose from "mongoose";

const historySchema = new mongoose.Schema({
    device: { type: String, required: true },
    command: { type: String, required: true },
    status: { type: String, required: true },
    led_temp: { type: String, required: true },
    led_humi: { type: String, required: true },
    led_light: { type: String, required: true },
    createdAt: { type: Date, default: Date.now } // Thời gian bấm nút
});

export default mongoose.model('History', historySchema);