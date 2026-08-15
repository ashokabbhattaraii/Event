const mongoose = require("mongoose");

// Explicit organization membership. The loose `user.organization` field is
// the tenant pointer for data scoping; OrganizationMember is the source of
// truth for *organization-level roles* (owner/admin/manager/member) and
// membership lifecycle (join / leave / removed).
const organizationMemberSchema = new mongoose.Schema(
  {
    organization: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    roleInOrg: {
      type: String,
      enum: ["owner", "admin", "manager", "member"],
      default: "member",
    },
    status: {
      type: String,
      enum: ["active", "pending", "removed"],
      default: "active",
    },
    invitedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    joinedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

// One active membership per user per organization; a removed membership
// doesn't block re-invitation.
organizationMemberSchema.index(
  { organization: 1, user: 1 },
  { unique: true, partialFilterExpression: { status: { $ne: "removed" } } }
);
organizationMemberSchema.index({ organization: 1, roleInOrg: 1 });
organizationMemberSchema.index({ user: 1 });

module.exports = mongoose.model("OrganizationMember", organizationMemberSchema);
