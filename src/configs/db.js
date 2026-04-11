// File: configs/db.js
const { Sequelize } = require('sequelize');

const sequelize = new Sequelize(
    process.env.DB_NAME,
    process.env.DB_USER,
    process.env.DB_PASS,
    {
        host: process.env.DB_HOST,
        port: process.env.DB_PORT,
        dialect: 'postgres',
        logging: false, // Tắt log SQL query ra console cho đỡ rối
        timezone: '+07:00' // Cài đặt múi giờ Việt Nam
    }
);

const connectDB = async () => {
    try {
        await sequelize.authenticate();
        console.log('🟢 Đã kết nối PostgreSQL thành công');
    } catch (error) {
        console.error('🔴 Lỗi kết nối PostgreSQL:', error);
        process.exit(1);
    }
};

module.exports = { sequelize, connectDB };