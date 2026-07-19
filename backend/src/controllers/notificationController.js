const Notification = require("../models/Notification");

const createNotification = async ({
  recipient,
  organization,
  type,
  title,
  message,
  event,
}) => {
  return Notification.create({ recipient, organization, type, title, message, event });
};

const getMyNotifications = async (req, res) => {
  try {
    const notifications = await Notification.find({ recipient: req.user._id })
      .populate("event", "title date")
      .sort({ createdAt: -1 })
      .limit(50);
    res.json({ notifications });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const markAsRead = async (req, res) => {
  try {
    const notification = await Notification.findOne({
      _id: req.params.id,
      recipient: req.user._id,
    });
    if (!notification) {
      return res.status(404).json({ message: "Notification not found" });
    }
    notification.read = true;
    await notification.save();
    res.json({ notification });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const markAllAsRead = async (req, res) => {
  try {
    await Notification.updateMany(
      { recipient: req.user._id, read: false },
      { read: true }
    );
    res.json({ message: "All notifications marked as read" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  createNotification,
  getMyNotifications,
  markAsRead,
  markAllAsRead,
};
