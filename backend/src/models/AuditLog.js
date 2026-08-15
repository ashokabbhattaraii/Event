const mongoose = require("mongoose");

// Immutable audit trail (report §24): every important security and
// organizational action is recorded with who, what, on which resource,
// the outcome, and request context.
const auditLogSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    organization: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization",
      default: null,
    },
    // Canonical action codes: login, logout, refresh, register, verify_email,
    // reset_password, organization_created, organization_updated,
    // member_added, member_role_changed, member_removed, role_updated,
    // event_created, event_updated, event_status_changed, event_deleted,
    // collaborator_invited, collaborator_accepted, collaborator_removed,
    // registration_created, ticket_cancelled, payment_completed,
    // ticket_checked_in, ai_trained.
    action: {
      type: String,
      required: [true, "Action is required"],
      index: true,
    },
    resourceType: {
      type: String,
      index: true,
    },
    resourceId: {
      type: mongoose.Schema.Types.ObjectId,
    },
    result: {
      type: String,
      enum: ["success", "failure", "denied"],
      default: "success",
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    ip: {
      type: String,
      default: "",
    },
    userAgent: {
      type: String,
      default: "",
    },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

auditLogSchema.index({ organization: 1, createdAt: -1 });
auditLogSchema.index({ user: 1, createdAt: -1 });
auditLogSchema.index({ action: 1, createdAt: -1 });

module.exports = mongoose.model("AuditLog", auditLogSchema);
