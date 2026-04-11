const { Op } = require('sequelize');
const { sequelize } = require('../configs/db');
const DataSensor = require('../models/DataSensor.model');
const Sensor = require('../models/Sensor.model');

exports.getSensorsData = async (req, res) => {
  try {
    const { page = 1, limit = 10, sortField = 'timestamp', sortDir = 'desc', sensorType, searchBy, search } = req.query;

    let whereCondition = {};
    let sensorWhere = {};

    if (sensorType && sensorType !== 'all') {
      if (sensorType === 'Temperature') sensorWhere.name = { [Op.iLike]: '%nhiệt độ%' };
      if (sensorType === 'Humidity') sensorWhere.name = { [Op.iLike]: '%độ ẩm%' };
      if (sensorType === 'Light') sensorWhere.name = { [Op.iLike]: '%ánh sáng%' };
    }

    if (search) {
      if (searchBy === 'value') {
        const val = Number(search);
        if (!isNaN(val)) whereCondition.value = val;
      } else if (searchBy === 'time') {
        whereCondition = sequelize.where(
          sequelize.fn('to_char', sequelize.col('DataSensor.timestamp'), 'DD/MM/YYYY HH24:MI:SS'),
          { [Op.iLike]: `%${search}%` }
        );
      }
    }

    let orderClause = [];
    if (sortField === 'sensor_name') {
      orderClause = [[Sensor, 'name', sortDir]];
    } else {
      const dbSortField = sortField === 'time' ? 'timestamp' : sortField;
      orderClause = [[dbSortField, sortDir]];
    }

    const offset = (Number(page) - 1) * Number(limit);
    const { count, rows } = await DataSensor.findAndCountAll({
      where: whereCondition,
      include: [{ model: Sensor, where: sensorWhere, attributes: ['name'] }],
      order: orderClause,
      limit: Number(limit),
      offset: offset
    });

    const formattedData = rows.map(item => ({
      _id: item.id.toString(),
      sensor_name: item.Sensor ? item.Sensor.name : "Unknown",
      value: Number(item.value),
      timestamp: item.timestamp
    }));

    res.status(200).json({
      data: formattedData,
      pagination: {
        currentPage: Number(page),
        totalPages: Math.ceil(count / Number(limit)) || 1,
        totalRecords: count
      }
    });

  } catch (error) {
    console.error("Lỗi getSensorsData:", error);
    res.status(500).json({ message: "Lỗi Server Nội Bộ" });
  }
};