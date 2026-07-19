const express = require("express");
const {
  getOrganizerAnalytics,
  getAdminAnalytics,
} = require("../controllers/analyticsController");
const { protect, requireRole } = require("../middleware/auth");

const router = express.Router();

router.get("/organizer", protect, requireRole("organizer", "admin"), getOrganizerAnalytics);
router.get("/admin", protect, requireRole("admin"), getAdminAnalytics);

module.exports = router;
