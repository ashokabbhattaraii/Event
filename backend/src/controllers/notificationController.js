const Notification = require("../models/Notification");
const { emitToUser } = require("../utils/socket");
const {
  parsePagination,
  buildSearch,
  buildFilters,
  parseSort,
  paginate,
} = require("../utils/query");

// Push the current unread count to the recipient's live sockets so the
// badge updates instantly, without the client having to refetch.
const emitUnreadCount = async (recipient) => {
  const count = await Notification.countDocuments({
    recipient,
    read: false,
  });
  emitToUser(recipient, "unread:count", { count });
  return count;
};

// The single chokepoint every notification in the app flows through —
// creating a notification also pushes it over the Socket.IO channel, so
// whatever activity created it is seen by the recipient in real time.
const createNotification = async ({
  recipient,
  organization,
  type,
  title,
  message,
  event,
  link,
  data,
}) => {
  const notification = await Notification.create({
    recipient,
    organization,
    type,
    title,
    message,
    event,
    link,
    data,
  });

  const unread = await emitUnreadCount(recipient);
  emitToUser(recipient, "notification:created", {
    notification,
    unread,
  });

  return notification;
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
    console.error("[error]", error);
    res.status(500).json({ success: false, message: "Something went wrong. Please try again.", code: "INTERNAL_ERROR" });
}
};

const getNotification = async (req, res) => {
  try {
    const notification = await Notification.findOne({
      _id: req.params.id,
      recipient: req.user._id,
    }).populate("event", "title date");
    if (!notification) {
      return res.status(404).json({ message: "Notification not found" });
    }
    res.json({ notification });
  } catch (error) {
    console.error("[error]", error);
    res.status(500).json({ success: false, message: "Something went wrong. Please try again.", code: "INTERNAL_ERROR" });
}
};

const getUnreadCount = async (req, res) => {
  try {
    const count = await Notification.countDocuments({
      recipient: req.user._id,
      read: false,
    });
    res.json({ count });
  } catch (error) {
    console.error("[error]", error);
    res.status(500).json({ success: false, message: "Something went wrong. Please try again.", code: "INTERNAL_ERROR" });
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

    // Keep other open tabs of the same user in sync (badge + list state).
    const unread = await emitUnreadCount(req.user._id);
    emitToUser(req.user._id, "notification:read", { id: notification._id, unread });

    res.json({ notification });
  } catch (error) {
    console.error("[error]", error);
    res.status(500).json({ success: false, message: "Something went wrong. Please try again.", code: "INTERNAL_ERROR" });
}
};

const markAllAsRead = async (req, res) => {
  try {
    await Notification.updateMany(
      { recipient: req.user._id, read: false },
      { read: true }
    );
    emitToUser(req.user._id, "notifications:read-all", { unread: 0 });

    res.json({ message: "All notifications marked as read" });
  } catch (error) {
    console.error("[error]", error);
    res.status(500).json({ success: false, message: "Something went wrong. Please try again.", code: "INTERNAL_ERROR" });
}
};

module.exports = {
  createNotification,
  getMyNotifications,
  getNotification,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
};