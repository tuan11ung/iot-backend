// File: routes/apiRoutes.js
const express = require('express');
const router = express.Router();
const apiController = require('../controllers/api.controller');

router.get('/sensors/data', apiController.getSensorsData);
router.get('/history', apiController.getActionHistory);
router.post('/control', apiController.controlDevice);

module.exports = router;