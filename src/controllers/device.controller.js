const Device = require('../models/Device.model');
const ActionHistory = require('../models/ActionHistory.model');
const mqttClient = require('../services/mqtt.service');

exports.controlDevice = async (req, res) => {
  const { device_id, action } = req.body;
  if (!action || !device_id) return res.status(400).json({ message: "Thiếu dữ liệu điều khiển" });

  try {
    const device = await Device.findOne({ where: { name: device_id } });
    const oldState = device ? device.current_state : "NULL";

    const actionEnum = action.toUpperCase().includes("ON") ? "ON" : "OFF";

    const newAction = await ActionHistory.create({
      device_id: device_id,
      action: actionEnum,
      status: "Pending",
      old_state: oldState,
      requested_at: new Date()
    });

    mqttClient.publish('tuan11ung/control', action);

    setTimeout(async () => {
      try {
        const checkAction = await ActionHistory.findByPk(newAction.id);
        if (checkAction && checkAction.status === "Pending") {
          checkAction.status = "Failed";
          await checkAction.save();
          console.log(`⏰ Lệnh ID [${newAction.id} - ${action}] đã bị Timeout (Quá 10s). Đã chốt thành Failed!`);
        }
      } catch (err) {
        console.error("Lỗi khi kiểm tra Timeout:", err);
      }
    }, 10000);

    const responseData = newAction.toJSON();
    responseData._id = responseData.id.toString();

    res.status(200).json({ message: "Đã gửi lệnh xuống mạch", data: responseData });

  } catch (error) {
    console.error("Lỗi API Control:", error);
    res.status(500).json({ message: "Lỗi server nội bộ" });
  }
};