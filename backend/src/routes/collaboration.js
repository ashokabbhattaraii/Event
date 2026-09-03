const express = require("express");
const { param, body } = require("express-validator");
const { protect, authorize } = require("../middleware/auth");
const validate = require("../middleware/validate");
const {
  listSuggestions,
  generateSuggestions,
  acceptSuggestion,
  declineSuggestion,
} = require("../controllers/collaborationController");
const {
  listMyInvitations,
  respondToInvitation,
} = require("../controllers/coHostInvitationController");

const router = express.Router();

// --- Co-host invitations addressed to the caller's organization ------------
// Organizers may read their org's inbox; only an org admin can bind the
// organization by accepting (enforced in the controller).
router.get("/invitations", protect, authorize("organizer", "admin", "org_admin"), listMyInvitations);
router.post(
  "/invitations/:invitationId/:action",
  protect,
  authorize("organizer", "admin", "org_admin"),
  [
    param("invitationId").isMongoId().withMessage("Invalid invitation id"),
    param("action").isIn(["accept", "decline"]).withMessage("action must be accept or decline"),
    body("message").optional().isLength({ max: 1000 }).withMessage("Message is too long"),
  ],
  validate,
  respondToInvitation
);

// AI collaboration suggestions for the caller's organization (readable by
// organizers and admins; decisions are admin-only in the controller).
router.get("/", protect, authorize("organizer", "admin", "org_admin"), listSuggestions);

// Re-run the match scan for the caller's organizations's events.
router.post("/generate", protect, authorize("organizer", "admin", "org_admin"), generateSuggestions);

// Admin decisions on their organization's side of a suggestion — only org_admin
// (tenants' admins) may bind the organization; organizers may view but not decide
// (enforced at route level, not just controller, to avoid relying on controller checks).
router.post("/:id/accept", protect, authorize("admin", "org_admin"), acceptSuggestion);
router.post("/:id/decline", protect, authorize("admin", "org_admin"), declineSuggestion);

module.exports = router;