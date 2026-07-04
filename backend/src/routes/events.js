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
const { protect, authorize } = require("../middleware/auth");
const validate = require("../middleware/validate");

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

module.exports = router;
