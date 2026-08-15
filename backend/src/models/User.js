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
    // Bumped whenever the account's privileges change (role change, password
    // change/reset). Access tokens carry the version at mint time, and
    // protect() rejects tokens whose version is stale — so a privilege
    // change invalidates every outstanding JWT and forces a re-login instead
    // of letting old sessions keep running with their previous role.
    tokenVersion: { type: Number, default: 0 },
    // Set the first time the ADMIN_EMAILS allowlist grants the admin role
    // (Google sign-in or privileged registration). A deliberate demotion
    // sticks: once granted, allowlist logins never re-promote — without this
    // a demoted admin would silently flip back to admin on their next
    // Google sign-in.
    adminGrantedAt: { type: Date },
    // Email verification (report §7). Set when the user confirms their email
    // address via the verification link; Google-verified accounts get it on
    // sign-up. A user without it may log in but the UI surfaces a banner.
    emailVerifiedAt: { type: Date },
    // One-time verification token (hashed) + expiry. Only stored while a
    // verification email is outstanding.
    emailVerificationToken: { type: String, select: false },
    emailVerificationExpiresAt: { type: Date },
    // Password-reset token (hashed) + expiry (report §7).
    passwordResetToken: { type: String, select: false },
    passwordResetExpiresAt: { type: Date },
    organization: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization",
    },
    // Whether to send email reminders for upcoming events and post-event feedback.
    // Defaults to true so attendees get reminders out of the box; can be toggled
    // in Settings → Notifications.
    reminderEmail: { type: Boolean, default: true },
    // Captured (with permission) from the browser on login. Powers
    // distance-based recommendations and the chatbot's "near me" answers.
    location: {
      lat: { type: Number },
      lng: { type: Number },
      city: { type: String },
      updatedAt: { type: Date },
      // GeoJSON mirror of lat/lng, kept in sync by the pre-save hook below.
      // Lets proximity queries (e.g. "notify attendees near this event") use
      // a real 2dsphere index instead of scanning every user's lat/lng in
      // application code.
      // No defaults on either sub-field: Mongoose would otherwise
      // auto-vivify { type: "Point" } (no coordinates) for every user
      // without a location, which the 2dsphere index below then rejects as
      // invalid GeoJSON. The pre-save hook sets both fields together, only
      // when lat/lng are actually present.
      geo: {
        type: { type: String, enum: ["Point"] },
        coordinates: { type: [Number] },
      },
    },
  },
  { timestamps: true }
);

userSchema.index({ "location.geo": "2dsphere" });

userSchema.pre("save", async function (next) {
  if (this.isModified("location") && this.location?.lat != null && this.location?.lng != null) {
    this.location.geo = { type: "Point", coordinates: [this.location.lng, this.location.lat] };
  }
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model("User", userSchema);
