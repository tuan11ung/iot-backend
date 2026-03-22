// File: server.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');

// Nhúng các module đã tách
const connectDB = require('./configs/db');
require('./services/mqtt.service'); // Khởi chạy MQTT tự động chạy ngầm
const apiRoutes = require('./routes/api.route');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Khởi chạy Database
connectDB();

// Khởi chạy các Routes
app.use('/api', apiRoutes);

// Khởi chạy Server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 API Server đang chạy tại http://localhost:${PORT}`);
});