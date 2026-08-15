const mongoose = require("mongoose");

// Tenant model. Onboarding is a two-step flow: an org admin registers the
// organization (full detail form → status "pending"), a platform superadmin
// verifies and approves it (status "active"), and only then can the org's
// users log in and manage their workspace.
const organizationSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Organization name is required"],
      trim: true,
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    status: {
      type: String,
      enum: ["pending", "active", "rejected", "suspended"],
      default: "pending",
    },
    // --- Registration details (org self-registration form) -------------------
    email: {
      type: String,
      lowercase: true,
      trim: true,
    },
    phone: String,
    address: String,
    city: String,
    country: String,
    type: {
      type: String,
      enum: ["Company", "Non-Profit", "Educational", "Community", "Government", "Other"],
    },
    description: String,
    website: String,
    // --- Approval workflow (superadmin) --------------------------------------
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    approvedAt: { type: Date },
    // Set when a superadmin rejects the registration (visible to the org admin
    // via the login error message so they know why).
    rejectionReason: String,
    rejectedAt: { type: Date },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Organization", organizationSchema);
