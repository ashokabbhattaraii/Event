const express = require("express");
const { protect, authorize } = require("../middleware/auth");
const {
  listSuggestions,
  generateSuggestions,
  acceptSuggestion,
  declineSuggestion,
} = require("../controllers/collaborationController");

const router = express.Router();

// AI collaboration suggestions for the caller's organization (readable by
// organizers and admins; decisions are admin-only in the controller).
router.get("/", protect, authorize("organizer", "admin"), listSuggestions);

// Re-run the match scan for the caller's organizations's events.
router.post("/generate", protect, authorize("organizer", "admin"), generateSuggestions);

// Admin decisions on their organization's side of a suggestion.
router.post("/:id/accept", protect, authorize("organizer", "admin"), acceptSuggestion);
router.post("/:id/decline", protect, authorize("organizer", "admin"), declineSuggestion);

module.exports = router;