require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { join } = require('path');
// 1. Import Swagger
const swaggerUi = require('swagger-ui-express');
const swaggerJsDoc = require('swagger-jsdoc');

const { sequelize, connectDB } = require('./configs/db');
const apiRoutes = require('./routes/api.route');

const app = express();

app.use(cors());
app.use(express.json());

// Khởi chạy Database
connectDB().then(async () => {
    // Lệnh này sẽ tự động ép PostgreSQL tạo 4 bảng dựa theo Models bạn đã viết
    await sequelize.sync({ alter: true });
    console.log('✅ Đã đồng bộ hóa các bảng trong PostgreSQL!');

    require('./services/mqtt.service');
});

// 2. CẤU HÌNH SWAGGER
const swaggerOptions = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'Smart Home IoT API',
            version: '1.0.0',
            description: 'Tài liệu API cho đồ án Hệ thống Nhà thông minh IoT',
            contact: {
                name: "Nguyễn Duy Tuấn Hưng"
            }
        },
        servers: [
            {
                url: `http://localhost:${process.env.PORT || 3000}`,
                description: 'Local Server'
            }
        ],
    },
    // Đường dẫn tới các file chứa comment mô tả API
    apis: [join(__dirname, './routes/*.js')],
};

const swaggerDocs = swaggerJsDoc(swaggerOptions);
// Tạo đường dẫn /api-docs để truy cập giao diện
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocs));

app.get('/api-docs.json', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(swaggerDocs);
});

// Routes chính
app.use('/api', apiRoutes);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 API Server đang chạy tại http://localhost:${PORT}`);
    console.log(`📑 API Docs đang chạy tại http://localhost:${PORT}/api-docs`); // Báo link Docs
});