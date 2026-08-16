const express = require("express");
const {
  getMyNotifications,
  getNotification,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
} = require("../controllers/notificationController");
const { protect } = require("../middleware/auth");

const router = express.Router();

// Static routes first so "/unread-count" is never captured by "/:id".
router.get("/unread-count", protect, getUnreadCount);
router.get("/", protect, getMyNotifications);
router.get("/:id", protect, getNotification);
router.put("/read-all", protect, markAllAsRead);
router.put("/:id/read", protect, markAsRead);

module.exports = router;