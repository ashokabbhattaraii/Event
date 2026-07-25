const express = require("express");
const { body } = require("express-validator");
const {
  listOrgUsers,
  updateUserRole,
  updateMyLocation,
  getOrgStats,
} = require("../controllers/userController");
const { protect, requireRole } = require("../middleware/auth");
const validate = require("../middleware/validate");

const router = express.Router();

// Available to any authenticated user (not just admins).
router.patch(
  "/me/location",
  protect,
  [
    body("lat")
      .isFloat({ min: -90, max: 90 })
      .withMessage("lat must be between -90 and 90"),
    body("lng")
      .isFloat({ min: -180, max: 180 })
      .withMessage("lng must be between -180 and 180"),
    body("city").optional().isString(),
  ],
  validate,
  updateMyLocation
);

router.get("/", protect, requireRole("admin"), listOrgUsers);
router.get("/stats", protect, requireRole("admin"), getOrgStats);
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
