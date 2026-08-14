const express = require("express");
const {
  getOrganizerAnalytics,
  getAdminAnalytics,
  getAudienceSegments,
  getMarketingInsight,
} = require("../controllers/analyticsController");
const { protect, requireRole } = require("../middleware/auth");

const router = express.Router();

router.get("/organizer", protect, requireRole("organizer", "admin"), getOrganizerAnalytics);
router.get("/admin", protect, requireRole("admin"), getAdminAnalytics);
router.get("/segments", protect, requireRole("organizer", "admin"), getAudienceSegments);
router.get("/marketing-insight", protect, requireRole("organizer", "admin"), getMarketingInsight);

module.exports = router;
