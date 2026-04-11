const express = require('express');
const router = express.Router();
const { getSensorsData, getActionHistory, controlDevice } = require('../controllers/api.controller');

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
 *           description: Lệnh điều khiển (VD FAN_ON, LIGHT_OFF)
 *       example:
 *         device_id: FAN
 *         action: FAN_ON
 *     DataSensor:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *         temperature:
 *           type: number
 *           format: float
 *         humidity:
 *           type: number
 *           format: float
 *         light:
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
 *         status:
 *           type: string
 *           enum: [Pending, Success, Failed, Timeout]
 *         old_state:
 *           type: string
 *         new_state:
 *           type: string
 *         requested_at:
 *           type: string
 *           format: date-time
 *         executed_at:
 *           type: string
 *           format: date-time
 *           nullable: true
 *     Pagination:
 *       type: object
 *       properties:
 *         currentPage:
 *           type: integer
 *         totalPages:
 *           type: integer
 *         totalRecords:
 *           type: integer
 *         itemsPerPage:
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
 *           type: object
 *           properties:
 *             currentPage:
 *               type: integer
 *             totalPages:
 *               type: integer
 *             totalRecords:
 *               type: integer
 *     ControlResponse:
 *       type: object
 *       properties:
 *         message:
 *           type: string
 *         data:
 *           $ref: '#/components/schemas/ActionHistory'
 *     ErrorResponse:
 *       type: object
 *       properties:
 *         message:
 *           type: string
 *       example:
 *         message: Loi server
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
 *         name: search
 *         schema:
 *           type: string
 *         description: Tìm kiếm toàn cục theo giá trị hoặc ID
 *       - in: query
 *         name: sortField
 *         schema:
 *           type: string
 *           enum: [id, temperature, humidity, light, time, timestamp]
 *         default: timestamp
 *         description: Trường sắp xếp
 *       - in: query
 *         name: sortDir
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *         default: desc
 *       - in: query
 *         name: filterType
 *         schema:
 *           type: string
 *           enum: [all, temperature, humidity, light]
 *         description: Loại cột cần lọc
 *       - in: query
 *         name: filterValue
 *         schema:
 *           type: string
 *         description: Giá trị lọc theo filterType
 *       - in: query
 *         name: fromDate
 *         schema:
 *           type: string
 *           example: 01/01/2026
 *         description: Ngày bắt đầu theo định dạng DD/MM/YYYY
 *       - in: query
 *         name: toDate
 *         schema:
 *           type: string
 *           example: 31/12/2026
 *         description: Ngày kết thúc theo định dạng DD/MM/YYYY
 *       - in: query
 *         name: hour
 *         schema:
 *           type: integer
 *           minimum: 0
 *           maximum: 23
 *       - in: query
 *         name: minute
 *         schema:
 *           type: integer
 *           minimum: 0
 *           maximum: 59
 *       - in: query
 *         name: second
 *         schema:
 *           type: integer
 *           minimum: 0
 *           maximum: 59
 *     responses:
 *       200:
 *         description: Thành công
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SensorsDataResponse'
 *       500:
 *         description: Lỗi server
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
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
 *         name: search
 *         schema:
 *           type: string
 *       - in: query
 *         name: sortField
 *         schema:
 *           type: string
 *           enum: [id, device, action, status, time, requested_at]
 *         default: requested_at
 *       - in: query
 *         name: sortDir
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *         default: desc
 *       - in: query
 *         name: filterType
 *         schema:
 *           type: string
 *           enum: [all, device, action, status]
 *       - in: query
 *         name: filterValue
 *         schema:
 *           type: string
 *       - in: query
 *         name: fromDate
 *         schema:
 *           type: string
 *           example: 01/01/2026
 *       - in: query
 *         name: toDate
 *         schema:
 *           type: string
 *           example: 31/12/2026
 *       - in: query
 *         name: hour
 *         schema:
 *           type: integer
 *           minimum: 0
 *           maximum: 23
 *       - in: query
 *         name: minute
 *         schema:
 *           type: integer
 *           minimum: 0
 *           maximum: 59
 *       - in: query
 *         name: second
 *         schema:
 *           type: integer
 *           minimum: 0
 *           maximum: 59
 *     responses:
 *       200:
 *         description: Thành công
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ActionHistoryResponse'
 *       500:
 *         description: Lỗi server
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
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
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ControlResponse'
 *       400:
 *         description: Thiếu dữ liệu đầu vào
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Lỗi server nội bộ
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post('/control', controlDevice);

module.exports = router;