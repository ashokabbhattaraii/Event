const express = require("express");
const { body } = require("express-validator");
const {
  listOrgUsers,
  updateUserRole,
  getOrgStats,
} = require("../controllers/userController");
const { protect, requireRole } = require("../middleware/auth");
const validate = require("../middleware/validate");

const router = express.Router();

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
