const express = require("express");
const { body, param } = require("express-validator");
const {
  listOrganizations,
  getMyOrganization,
  updateMyOrganization,
  listMembers,
  addMember,
  updateMemberRole,
  removeMember,
} = require("../controllers/organizationController");
const { protect, requireRole, requireOrgAdmin } = require("../middleware/auth");
const validate = require("../middleware/validate");

const router = express.Router();

router.get("/", listOrganizations);
router.get("/me", protect, requireRole("admin"), getMyOrganization);
router.put("/me", protect, requireRole("admin"), updateMyOrganization);

// --- Membership (org-level roles) — tenant admins only --------------------
router.get(
  "/members",
  protect,
  requireRole("admin", "organizer"),
  requireOrgAdmin,
  listMembers
);

router.post(
  "/members",
  protect,
  requireRole("admin", "organizer"),
  requireOrgAdmin,
  [
    body("email").isEmail().withMessage("Valid email is required"),
    body("roleInOrg")
      .optional()
      .isIn(["owner", "admin", "manager", "member"])
      .withMessage("Invalid organization role"),
  ],
  validate,
  addMember
);

router.patch(
  "/members/:userId",
  protect,
  requireRole("admin"),
  requireOrgAdmin,
  [
    param("userId").isMongoId().withMessage("Invalid user id"),
    body("roleInOrg")
      .isIn(["owner", "admin", "manager", "member"])
      .withMessage("Invalid organization role"),
  ],
  validate,
  updateMemberRole
);

router.delete(
  "/members/:userId",
  protect,
  requireRole("admin", "organizer"),
  requireOrgAdmin,
  [param("userId").isMongoId().withMessage("Invalid user id")],
  validate,
  removeMember
);

module.exports = router;
