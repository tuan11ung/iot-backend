const { Op } = require('sequelize');
const { sequelize } = require('../configs/db');
const ActionHistory = require('../models/ActionHistory.model');

exports.getActionHistory = async (req, res) => {
  try {
    const { page = 1, limit = 10, sortField = 'requested_at', sortDir = 'desc', filterDevice, searchBy, search } = req.query;

    let whereCondition = {};

    if (filterDevice && filterDevice !== 'all') {
      whereCondition.device_id = filterDevice;
    }

    if (search) {
      if (searchBy === 'info') {
        let orConditions = [
          sequelize.where(sequelize.cast(sequelize.col('action'), 'varchar'), { [Op.iLike]: `%${search}%` }),
          sequelize.where(sequelize.cast(sequelize.col('status'), 'varchar'), { [Op.iLike]: `%${search}%` }),
          { device_id: { [Op.iLike]: `%${search}%` } }
        ];
        const searchNum = parseInt(search, 10);
        if (!isNaN(searchNum)) orConditions.push({ id: searchNum });
        whereCondition[Op.or] = orConditions;
      } else if (searchBy === 'time') {
        whereCondition = sequelize.where(
          sequelize.fn('to_char', sequelize.col('requested_at'), 'DD/MM/YYYY HH24:MI:SS'),
          { [Op.iLike]: `%${search}%` }
        );
      }
    }

    const dbSortField = sortField === 'time' ? 'requested_at' : sortField;
    const orderClause = [[dbSortField, sortDir]];

    const offset = (Number(page) - 1) * Number(limit);
    const { count, rows } = await ActionHistory.findAndCountAll({
      where: whereCondition,
      order: orderClause,
      limit: Number(limit),
      offset: offset
    });

    const formattedData = rows.map(item => ({
      _id: item.id.toString(),
      device_id: item.device_id,
      action: item.action,
      status: item.status,
      requested_at: item.requested_at
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
    console.error("Lỗi getActionHistory:", error);
    res.status(500).json({ message: "Lỗi Server Nội Bộ" });
  }
};