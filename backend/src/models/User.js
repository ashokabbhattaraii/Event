const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      // Password is only required for local (email/password) accounts.
      // Google sign-in creates accounts that authenticate via googleId instead.
      required: [
        function () {
          return !this.googleId;
        },
        "Password is required",
      ],
      minlength: 6,
      select: false,
    },
    googleId: {
      type: String,
      // Sparse: only Google-linked accounts carry this field.
      index: { unique: true, sparse: true },
    },
    role: {
      type: String,
      enum: ["admin", "organizer", "attendee"],
      default: "attendee",
    },
    organization: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization",
    },
    // Captured (with permission) from the browser on login. Powers
    // distance-based recommendations and the chatbot's "near me" answers.
    location: {
      lat: { type: Number },
      lng: { type: Number },
      city: { type: String },
      updatedAt: { type: Date },
    },
  },
  { timestamps: true }
);

userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model("User", userSchema);
