const express = require("express");
const { body, param } = require("express-validator");
const {
  listPendingOrgs,
  approveOrg,
  rejectOrg,
  updateOrganization,
} = require("../controllers/systemAdminController");
const { protect, requireSystemAdmin } = require("../middleware/auth");
const validate = require("../middleware/validate");

const router = express.Router();

// System-admin org approval console — the overall admin (no organization)
// verifies pending organization registrations (PDF: admin controls all
// tenant companies).
router.use(protect, requireSystemAdmin);

router.get("/orgs", listPendingOrgs);
router.post(
  "/orgs/:id/approve",
  [param("id").isMongoId().withMessage("Invalid organization id")],
  validate,
  approveOrg
);
router.post(
  "/orgs/:id/reject",
  [
    param("id").isMongoId().withMessage("Invalid organization id"),
    body("reason").notEmpty().withMessage("Rejection reason is required"),
  ],
  validate,
  rejectOrg
);

// Rename / suspend / reactivate a provisioned tenant (system admin only).
router.patch(
  "/orgs/:id",
  [param("id").isMongoId().withMessage("Invalid organization id")],
  validate,
  updateOrganization
);

module.exports = router;
