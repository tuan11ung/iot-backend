// File: configs/db.js
const mongoose = require('mongoose');

const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('🟢 Đã kết nối MongoDB thành công');
    } catch (error) {
        console.error('🔴 Lỗi kết nối MongoDB:', error);
        process.exit(1); // Dừng server nếu lỗi DB
    }
};

module.exports = connectDB;