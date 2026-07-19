const express = require("express");
const {
  listOrganizations,
  getMyOrganization,
  updateMyOrganization,
} = require("../controllers/organizationController");
const { protect, requireRole } = require("../middleware/auth");

const router = express.Router();

router.get("/", listOrganizations);
router.get("/me", protect, requireRole("admin"), getMyOrganization);
router.put("/me", protect, requireRole("admin"), updateMyOrganization);

module.exports = router;
