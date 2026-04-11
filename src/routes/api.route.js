const express = require('express');
const router = express.Router();

// Gọi 3 file controller riêng biệt
const { getSensorsData } = require('../controllers/sensor.controller');
const { getActionHistory } = require('../controllers/history.controller');
const { controlDevice } = require('../controllers/device.controller');

/**
 * @swagger
 * components:
 *   schemas:
 *     ControlRequest:
 *       type: object
 *       required:
 *         - device_id
 *         - action
 *       properties:
 *         device_id:
 *           type: string
 *           description: Tên thiết bị cần điều khiển (VD FAN, AC, LIGHT)
 *         action:
 *           type: string
 *           description: Lệnh điều khiển (VD ON, OFF, FAN_ON)
 *       example:
 *         device_id: FAN
 *         action: FAN_ON
 *     DataSensor:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *         sensor_name:
 *           type: string
 *         value:
 *           type: number
 *           format: float
 *         timestamp:
 *           type: string
 *           format: date-time
 *     ActionHistory:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *         device_id:
 *           type: string
 *         action:
 *           type: string
 *           enum: [ON, OFF]
 *         status:
 *           type: string
 *           enum: [Pending, Success, Failed, Timeout]
 *         requested_at:
 *           type: string
 *           format: date-time
 *     Pagination:
 *       type: object
 *       properties:
 *         currentPage:
 *           type: integer
 *         totalPages:
 *           type: integer
 *         totalRecords:
 *           type: integer
 *     SensorsDataResponse:
 *       type: object
 *       properties:
 *         data:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/DataSensor'
 *         pagination:
 *           $ref: '#/components/schemas/Pagination'
 *     ActionHistoryResponse:
 *       type: object
 *       properties:
 *         data:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/ActionHistory'
 *         pagination:
 *           $ref: '#/components/schemas/Pagination'
 */

/**
 * @swagger
 * /api/sensors/data:
 *   get:
 *     summary: Lấy dữ liệu cảm biến (Có phân trang, lọc, sắp xếp)
 *     tags:
 *       - Sensors
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *         default: 1
 *         description: Số trang hiện tại
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         default: 10
 *         description: Số bản ghi trên trang
 *       - in: query
 *         name: sensorType
 *         schema:
 *           type: string
 *           enum: [all, Temperature, Humidity, Light]
 *         default: all
 *         description: Lọc theo loại cảm biến
 *       - in: query
 *         name: searchBy
 *         schema:
 *           type: string
 *           enum: [value, time]
 *         default: value
 *         description: Chế độ tìm kiếm (Giá trị hoặc Thời gian)
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Từ khóa tìm kiếm (VD 34.5 hoặc 04/04/2026 15:30)
 *       - in: query
 *         name: sortField
 *         schema:
 *           type: string
 *           enum: [id, sensor_name, value, timestamp]
 *         default: timestamp
 *         description: Trường cần sắp xếp
 *       - in: query
 *         name: sortDir
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *         default: desc
 *         description: Chiều sắp xếp
 *     responses:
 *       200:
 *         description: Thành công
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SensorsDataResponse'
 */
router.get('/sensors/data', getSensorsData);

/**
 * @swagger
 * /api/history:
 *   get:
 *     summary: Lấy lịch sử điều khiển thiết bị
 *     tags:
 *       - Action History
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *         default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         default: 10
 *       - in: query
 *         name: filterDevice
 *         schema:
 *           type: string
 *           enum: [all, FAN, AC, LIGHT]
 *         default: all
 *         description: Lọc theo thiết bị cụ thể
 *       - in: query
 *         name: searchBy
 *         schema:
 *           type: string
 *           enum: [info, time]
 *         default: info
 *         description: Chế độ tìm kiếm (Thông tin hoặc Thời gian)
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Từ khóa tìm kiếm (ID, ON/OFF, Success...)
 *       - in: query
 *         name: sortField
 *         schema:
 *           type: string
 *           enum: [id, device_id, action, status, requested_at]
 *         default: requested_at
 *       - in: query
 *         name: sortDir
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *         default: desc
 *     responses:
 *       200:
 *         description: Thành công
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ActionHistoryResponse'
 */
router.get('/history', getActionHistory);

/**
 * @swagger
 * /api/control:
 *   post:
 *     summary: Gửi lệnh điều khiển thiết bị xuống mạch ESP32
 *     tags:
 *       - Device Control
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ControlRequest'
 *     responses:
 *       200:
 *         description: Đã gửi lệnh (Pending) xuống mạch
 *       400:
 *         description: Thiếu dữ liệu đầu vào
 *       500:
 *         description: Lỗi server nội bộ
 */
router.post('/control', controlDevice);

module.exports = router;