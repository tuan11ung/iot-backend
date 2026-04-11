const { DataTypes } = require('sequelize');
const { sequelize } = require('../configs/db');
const Device = require('./Device.model');

const ActionHistory = sequelize.define('ActionHistory', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    device_id: { type: DataTypes.STRING(50), allowNull: false }, // Để đơn giản, ta dùng tên thiết bị thay vì ID số
    action: { type: DataTypes.ENUM('ON', 'OFF'), allowNull: false },
    status: { type: DataTypes.ENUM('Pending', 'Success', 'Failed', 'Timeout'), defaultValue: 'Pending' },
    old_state: { type: DataTypes.ENUM('ON', 'OFF', 'NULL') },
    new_state: { type: DataTypes.ENUM('ON', 'OFF', 'NULL') },
    requested_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    executed_at: { type: DataTypes.DATE }
}, { tableName: 'action_history', timestamps: false });

module.exports = ActionHistory;