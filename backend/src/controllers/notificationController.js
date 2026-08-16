const Notification = require("../models/Notification");
const {
  parsePagination,
  buildSearch,
  buildFilters,
  parseSort,
  paginate,
} = require("../utils/query");

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
    const { page, limit, skip } = parsePagination(req.query, { defaultLimit: 20 });
    const filter = {
      recipient: req.user._id,
      ...buildSearch(req.query.search, ["title", "message"]),
      ...buildFilters(req.query, ["type"]),
    };
    // read is a boolean field — buildFilters would pass "true"/"false" strings.
    if (req.query.read === "true") filter.read = true;
    else if (req.query.read === "false") filter.read = false;

    const sort = parseSort(req.query.sort, ["createdAt", "read"], { createdAt: -1 });

    const { data, pagination } = await paginate(Notification, {
      filter,
      page,
      limit,
      skip,
      sort,
      populate: { path: "event", select: "title date" },
    });
    res.json({ notifications: data, pagination });
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
