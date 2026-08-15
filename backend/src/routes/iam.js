const express = require("express");
const { body, param } = require("express-validator");
const {
  listRoles,
  listPermissions,
  updateRolePermissions,
} = require("../controllers/iamController");
const { protect, requireRole } = require("../middleware/auth");
const validate = require("../middleware/validate");

const router = express.Router();

router.use(protect, requireRole("admin"));

// Role & permission management (report §4, §18) — administrators only.
router.get("/roles", listRoles);
router.get("/permissions", listPermissions);
router.put(
  "/roles/:id/permissions",
  [
    param("id").isMongoId().withMessage("Invalid role id"),
    body("permissions").isArray().withMessage("permissions must be an array"),
  ],
  validate,
  updateRolePermissions
);

module.exports = router;
