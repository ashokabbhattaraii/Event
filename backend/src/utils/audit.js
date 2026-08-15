// Audit logging (report §24). Fire-and-forget by design: audit writes must
// never block or fail a request, so every variant swallows its own errors.
// Controllers call audit() at the interesting points (login, payment,
// check-in, ...); the audit trail is read by admins via GET /api/audit.
const AuditLog = require("../models/AuditLog");

const clientContext = (req) => ({
  ip:
    (req?.ip || req?.headers?.["x-forwarded-for"]?.split(",")[0]?.trim() || "").replace(/^::ffff:/, ""),
  userAgent: req?.headers?.["user-agent"] || "",
});

const audit = async ({
  req,
  user,
  organization,
  action,
  resourceType,
  resourceId,
  result = "success",
  metadata = {},
}) => {
  try {
    const context = clientContext(req);
    await AuditLog.create({
      user: user?._id ?? req?.user?._id ?? null,
      organization: organization?._id ?? req?.user?.organization ?? null,
      action,
      resourceType,
      resourceId,
      result,
      metadata,
      ip: context.ip,
      userAgent: context.userAgent,
    });
  } catch (error) {
    console.error(`[audit] ${action} failed to persist:`, error.message);
  }
};

module.exports = { audit };
