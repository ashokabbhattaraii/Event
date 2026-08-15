const AuditLog = require("../models/AuditLog");
const { parsePagination, parseSort } = require("../utils/query");

// Admin-only audit trail reader (report §24). Supports filtering by action,
// resource type, user, and date range, with pagination.
const listAuditLogs = async (req, res) => {
  try {
    const { action, resourceType, userId, from, to, sort } = req.query;
    const filter = {};
    if (action) filter.action = action;
    if (resourceType) filter.resourceType = resourceType;
    if (userId) filter.user = userId;
    if (from || to) {
      filter.createdAt = {};
      if (from) filter.createdAt.$gte = new Date(from);
      if (to) filter.createdAt.$lte = new Date(to);
    }
    // Admins are tenant-scoped too: only their own organization's trail.
    if (req.user.organization) {
      filter.organization = req.user.organization;
    }

    const { page, limit, skip } = parsePagination(req.query, { defaultLimit: 50, maxLimit: 200 });
    const total = await AuditLog.countDocuments(filter);
    const logs = await AuditLog.find(filter)
      .populate("user", "name email")
      .sort(parseSort(sort, ["createdAt", "action"], { createdAt: -1 }))
      .skip(skip)
      .limit(limit)
      .lean();

    res.json({
      logs,
      total,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { listAuditLogs };
