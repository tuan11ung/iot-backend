const { DataTypes } = require('sequelize');
const { sequelize } = require('../configs/db');

const Device = sequelize.define('Device', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    name: { type: DataTypes.STRING(50), allowNull: false },
    type: { type: DataTypes.STRING(50), allowNull: false },
    current_state: { type: DataTypes.ENUM('ON', 'OFF', 'NULL'), defaultValue: 'NULL' },
    last_updated: { type: DataTypes.DATE, defaultValue: DataTypes.NOW }
}, { tableName: 'devices', timestamps: false });

module.exports = Device;