const mongoose = require('mongoose');

const actionHistorySchema = new mongoose.Schema({
    device_id: { type: String, required: true }, // Dùng String để dễ truyền tên thiết bị (VD: LED_TEMP)
    action: { type: String, required: true },    // Lệnh gửi đi (VD: LED_TEMP_ON)
    status: { type: String, enum: ['Pending', 'Success', 'Failed', 'Timeout'], default: 'Pending' },
    old_state: { type: String },                 // Trạng thái trước khi bấm
    new_state: { type: String },                 // Trạng thái sau khi mạch chạy xong
    requested_at: { type: Date, default: Date.now },
    executed_at: { type: Date }                  // Sẽ cập nhật khi mạch trả response
});

module.exports = mongoose.model('Action_History', actionHistorySchema);