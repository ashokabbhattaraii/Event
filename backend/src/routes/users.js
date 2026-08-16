const express = require("express");
const { body } = require("express-validator");
const {
  listOrgUsers,
  createUser,
  updateUserRole,
  updateMyLocation,
  updateMyProfile,
  updateMyPassword,
  updateReminderPreference,
  getMySavedEvents,
  addSavedEvent,
  removeSavedEvent,
  getOrgStats,
} = require("../controllers/userController");
const { protect, requireRole } = require("../middleware/auth");
const validate = require("../middleware/validate");

const router = express.Router();

// Available to any authenticated user (not just admins). lat/lng are
// optional: omitting them clears the saved location (used by the settings
// page's "Remove location").
router.patch(
  "/me/location",
  protect,
  [
    body("lat").optional().isFloat({ min: -90, max: 90 }).withMessage("lat must be between -90 and 90"),
    body("lng").optional().isFloat({ min: -180, max: 180 }).withMessage("lng must be between -180 and 180"),
    body("city").optional().isString(),
  ],
  validate,
  updateMyLocation
);

// Settings endpoints — available to every authenticated role so the same
// settings UI works on the attendee, organizer and admin dashboards.
router.patch(
  "/me/profile",
  protect,
  [body("name").notEmpty().withMessage("Name is required")],
  validate,
  updateMyProfile
);

router.patch(
  "/me/reminders",
  protect,
  [body("reminderEmail").isBoolean().withMessage("reminderEmail must be a boolean")],
  validate,
  updateReminderPreference
);

router.patch(
  "/me/password",
  protect,
  [
    body("currentPassword").notEmpty().withMessage("Current password is required"),
    body("newPassword").isLength({ min: 6 }).withMessage("New password must be at least 6 characters"),
  ],
  validate,
  updateMyPassword
);

router.get("/", protect, requireRole("admin"), listOrgUsers);
router.get("/stats", protect, requireRole("admin"), getOrgStats);

// Server-side saved events — available to every authenticated role.
router.get("/me/saved-events", protect, getMySavedEvents);
router.post("/me/saved-events/:eventId", protect, addSavedEvent);
router.delete("/me/saved-events/:eventId", protect, removeSavedEvent);
router.post(
  "/",
  protect,
  requireRole("admin"),
  [
    body("name").notEmpty().withMessage("Name is required"),
    body("email").isEmail().withMessage("Valid email is required"),
    body("password")
      .isLength({ min: 6 })
      .withMessage("Password must be at least 6 characters"),
    body("role").optional().isIn(["admin", "organizer", "attendee"]).withMessage("Invalid role"),
    body("organizationId")
      .optional()
      .isMongoId()
      .withMessage("organizationId must be a valid id"),
  ],
  validate,
  createUser
);
router.put(
  "/:id/role",
  protect,
  requireRole("admin"),
  [
    body("role")
      .isIn(["admin", "organizer", "attendee"])
      .withMessage("Invalid role"),
  ],
  validate,
  updateUserRole
);

module.exports = router;
