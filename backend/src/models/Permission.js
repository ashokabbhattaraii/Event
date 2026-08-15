const mongoose = require("mongoose");

const permissionSchema = new mongoose.Schema(
  {
    // Stable identifier used in Role.permissions, e.g. "event:manage",
    // "user:manage", "audit:view", "collaboration:invite".
    code: {
      type: String,
      required: [true, "Permission code is required"],
      unique: true,
      trim: true,
      lowercase: true,
    },
    name: {
      type: String,
      required: [true, "Permission name is required"],
      trim: true,
    },
    description: {
      type: String,
      default: "",
    },
    // "system" = fixed capability used by requirePermission across the app;
    // "organization" = tenant-level capability assignable via org roles.
    scope: {
      type: String,
      enum: ["system", "organization"],
      default: "system",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Permission", permissionSchema);
