const express = require("express");
const { body } = require("express-validator");
const {
  createEvent,
  getMyEvents,
  getEventById,
  updateEvent,
  deleteEvent,
  getAllEvents,
} = require("../controllers/eventController");
const { registerForEvent } = require("../controllers/ticketController");
const { protect, authorize, requireRole } = require("../middleware/auth");
const validate = require("../middleware/validate");
const rateLimit = require("../middleware/rateLimit");

const registerLimiter = rateLimit({ windowMs: 60_000, max: 15 });

const router = express.Router();

router.get("/", getAllEvents);

router.get("/my", protect, authorize("organizer", "admin"), getMyEvents);

router.get("/:id", getEventById);

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
  ],
  validate,
  createEvent
);

router.put("/:id", protect, authorize("organizer", "admin"), updateEvent);

router.delete("/:id", protect, authorize("organizer", "admin"), deleteEvent);

router.post(
  "/:id/register",
  protect,
  requireRole("attendee"),
  registerLimiter,
  registerForEvent
);

module.exports = router;
