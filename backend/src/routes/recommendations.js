const express = require("express");
const { getRecommendations } = require("../controllers/recommendationController");
const { protect, requireRole } = require("../middleware/auth");

const router = express.Router();

router.get("/", protect, requireRole("attendee"), getRecommendations);

module.exports = router;
