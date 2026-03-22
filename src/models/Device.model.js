const mongoose = require('mongoose');

const deviceSchema = new mongoose.Schema({
    // MongoDB tự có _id làm Primary Key
    name: { type: String, required: true }, // VD: FAN / AC / LIGHT
    type: { type: String, required: true }, // VD: Quạt / Điều hòa / Đèn
    current_state: { type: String, default: 'OFF' }, // ON | OFF | BLINK | FADE
    last_updated: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Device', deviceSchema);