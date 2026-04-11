const { DataTypes } = require('sequelize');
const { sequelize } = require('../configs/db');

const Sensor = sequelize.define('Sensor', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    name: { type: DataTypes.STRING(100), allowNull: false },
    sensor_type: { type: DataTypes.STRING(50) },
    is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
    created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW }
}, { tableName: 'sensors', timestamps: false });

module.exports = Sensor;