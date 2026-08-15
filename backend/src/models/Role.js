const mongoose = require("mongoose");

const roleSchema = new mongoose.Schema(
  {
    // "admin" | "organizer" | "attendee" (system roles), or an
    // organization-scoped role name (e.g. "event-manager") for tenants.
    name: {
      type: String,
      required: [true, "Role name is required"],
      unique: true,
      trim: true,
      lowercase: true,
    },
    description: {
      type: String,
      default: "",
    },
    scope: {
      type: String,
      enum: ["system", "organization"],
      default: "system",
    },
    // Permission codes (see models/Permission.js). System roles are seeded
    // with the application's permission matrix; organization roles let an
    // admin compose custom capabilities for members of their tenant.
    permissions: {
      type: [String],
      default: [],
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Role", roleSchema);
