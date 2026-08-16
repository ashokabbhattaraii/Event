const express = require("express");
const { body } = require("express-validator");
const {
  createEvent,
  getMyEvents,
  getEventById,
  updateEvent,
  deleteEvent,
  getAllEvents,
  getOrgEvents,
  getEventAiInsight,
  addCoHostOrganization,
  removeCoHostOrganization,
  listCoHostOrganizations,
} = require("../controllers/eventController");
const { registerForEvent, getEventAttendees } = require("../controllers/ticketController");
const {
  submitFeedback,
  getMyFeedback,
  getEventFeedback,
} = require("../controllers/feedbackController");
const { getEventNetworking } = require("../controllers/networkingController");
const { protect, optionalAuth, authorize, requireRole, requirePermission } = require("../middleware/auth");
const validate = require("../middleware/validate");
const rateLimit = require("../middleware/rateLimit");

const registerLimiter = rateLimit({ windowMs: 60_000, max: 15 });
const feedbackLimiter = rateLimit({ windowMs: 60_000, max: 10 });

const router = express.Router();

router.get("/", getAllEvents);

router.get("/my", protect, authorize("organizer", "admin"), getMyEvents);

router.get("/org", protect, authorize("admin"), getOrgEvents);

router.get("/:id", optionalAuth, getEventById);

// Full attendee roster for a managed event (organizer/admin) — powers the
// Tickets & Check-in dashboard's attendee list + per-attendee detail view.
router.get("/:id/attendees", protect, authorize("organizer", "admin"), getEventAttendees);

// Real AI insight (LLM with heuristic fallback) + attendance forecast for
// the organizer's event workspace.
router.get("/:id/ai-insight", protect, authorize("organizer", "admin"), getEventAiInsight);

router.post(
  "/",
  protect,
  authorize("organizer", "admin"),
  [
    body("title").notEmpty().withMessage("Title is required"),
    body("date").notEmpty().withMessage("Date is required"),
    body("venue").notEmpty().withMessage("Venue is required"),
    body("category").notEmpty().withMessage("Category is required"),
    body("capacity").isInt({ min: 1 }).withMessage("Capacity must be at least 1"),
    body("type")
      .optional()
      .isIn(["In-person", "Hybrid", "Virtual"])
      .withMessage("Invalid event type"),
    body("imageUrl").optional().isLength({ max: 6_000_000 }).withMessage("Image is too large"),
    body("tags").optional().isArray().withMessage("Tags must be a list"),
    body("highlights").optional().isArray().withMessage("Highlights must be a list"),
    body("agenda").optional().isArray().withMessage("Agenda must be a list"),
    body("speakers").optional().isArray().withMessage("Speakers must be a list"),
    body("contactEmail").optional({ checkFalsy: true }).isEmail().withMessage("Invalid contact email"),
  ],
  validate,
  createEvent
);

router.put("/:id", protect, authorize("organizer", "admin"), updateEvent);

router.delete("/:id", protect, authorize("organizer", "admin"), deleteEvent);

// Co-host organization management (event organizer or owning org admin)
router.get(
  "/:id/co-hosts",
  protect,
  authorize("organizer", "admin"),
  listCoHostOrganizations
);
router.post(
  "/:id/co-hosts",
  protect,
  authorize("organizer", "admin"),
  [
    body("organizationId").isMongoId().withMessage("Valid organizationId is required"),
  ],
  validate,
  addCoHostOrganization
);
router.delete(
  "/:id/co-hosts/:orgId",
  protect,
  authorize("organizer", "admin"),
  removeCoHostOrganization
);

router.post(
  "/:id/register",
  protect,
  requireRole("attendee"),
  registerLimiter,
  registerForEvent
);

router.get("/:id/networking", protect, requireRole("attendee"), getEventNetworking);

router.get("/:id/feedback/me", protect, requireRole("attendee"), getMyFeedback);

router.post(
  "/:id/feedback",
  protect,
  requireRole("attendee"),
  requirePermission("feedback:submit"),
  feedbackLimiter,
  [
    body("rating").isInt({ min: 1, max: 5 }).withMessage("Rating must be between 1 and 5"),
    body("comment").optional().isLength({ max: 1000 }).withMessage("Comment is too long"),
  ],
  validate,
  submitFeedback
);

router.get("/:id/feedback", protect, requireRole("organizer", "admin"), getEventFeedback);

module.exports = router;
