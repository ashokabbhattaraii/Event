const express = require("express");
const { listAuditLogs } = require("../controllers/auditController");
const { protect, requireRole } = require("../middleware/auth");

const router = express.Router();

// Security/audit trail — administrators only (report §24).
router.get("/", protect, requireRole("admin"), listAuditLogs);

module.exports = router;
