const { DataTypes } = require('sequelize');
const { sequelize } = require('../configs/db');
const Sensor = require('./Sensor.model');

const DataSensor = sequelize.define('DataSensor', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    sensor_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: Sensor, key: 'id' }
    },
    value: { type: DataTypes.DOUBLE, allowNull: false },
    timestamp: { type: DataTypes.DATE, defaultValue: DataTypes.NOW }
}, { tableName: 'data_sensors', timestamps: false });

Sensor.hasMany(DataSensor, { foreignKey: 'sensor_id' });
DataSensor.belongsTo(Sensor, { foreignKey: 'sensor_id' });

module.exports = DataSensor;