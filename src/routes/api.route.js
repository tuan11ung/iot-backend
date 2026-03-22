const express = require('express');
const router = express.Router();
const apiController = require('../controllers/api.controller');

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
 *         default: timestamp
 *       - in: query
 *         name: sortDir
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *         default: desc
 *     responses:
 *       200:
 *         description: Thành công
 */
router.get('/sensors/data', apiController.getSensorsData);

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
 *     responses:
 *       200:
 *         description: Thành công
 */
router.get('/history', apiController.getActionHistory);

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
 */
router.post('/control', apiController.controlDevice);

module.exports = router;