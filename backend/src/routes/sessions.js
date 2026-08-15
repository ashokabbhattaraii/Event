const express = require("express");
const { body, param } = require("express-validator");
const {
  createSession,
  getEventSessions,
  getSessionById,
  updateSession,
  deleteSession,
} = require("../controllers/sessionController");
const { protect, authorize } = require("../middleware/auth");
const validate = require("../middleware/validate");

const router = express.Router({ mergeParams: true });

// Session routes (event-scoped)
router.get("/", protect, authorize("organizer", "admin", "attendee"), getEventSessions);
router.get("/:id", protect, authorize("organizer", "admin", "attendee"), getSessionById);

router.post(
  "/",
  protect,
  authorize("organizer", "admin"),
  [
    body("title").notEmpty().withMessage("Title is required"),
    body("startTime").notEmpty().withMessage("startTime is required"),
    body("endTime").notEmpty().withMessage("endTime is required"),
    body("track").optional().isString(),
    body("speakers").optional().isArray(),
    body("capacity").optional().isInt({ min: 0 }),
    body("isPublic").optional().isBoolean(),
  ],
  validate,
  createSession
);

router.put(
  "/:id",
  protect,
  authorize("organizer", "admin"),
  [
    body("title").optional().notEmpty().withMessage("Title cannot be empty"),
    body("startTime").optional().isISO8601().withMessage("Invalid startTime"),
    body("endTime").optional().isISO8601().withMessage("Invalid endTime"),
    body("speakers").optional().isArray(),
    body("capacity").optional().isInt({ min: 0 }),
    body("isPublic").optional().isBoolean(),
    body("status").optional().isIn(["scheduled", "live", "completed", "cancelled"]),
  ],
  validate,
  updateSession
);

router.delete("/:id", protect, authorize("organizer", "admin"), deleteSession);

module.exports = router;