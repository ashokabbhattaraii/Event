const mongoose = require("mongoose");

// A refresh-token session. The token itself is never stored — only a SHA-256
// hash — so a DB leak doesn't yield usable credentials. Rotation (every
// POST /auth/refresh mints a new pair and replaces the stored hash) plus
// reuse detection: presenting a token whose hash is no longer the stored one
// marks it as theft and revokes every session for that user.
//
// NOTE: this is the auth "session" (refresh-token), NOT an event schedule
// session. Event schedule items (talks/slots within an event) live in
// models/EventSession.js. The two were previously collapsed onto the same
// model name "Session", which made `Session.create({ user, refreshTokenHash })`
// in the login flow fail validation against the event-schedule schema
// (event/organization/title/startTime/endTime required) — login was broken.
const sessionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    refreshTokenHash: {
      type: String,
      required: true,
      unique: true,
      select: false,
    },
    // Hash of the token this session had BEFORE its last rotation. Lets
    // reuse detection tell "a replayed, already-rotated token" (theft — the
    // previous token was presented again) apart from "garbage hash" (401
    // without escalation). Not unique: only the current hash must be.
    previousTokenHash: { type: String, select: false },
    ip: String,
    userAgent: String,
    expiresAt: {
      type: Date,
      required: true,
    },
    revokedAt: Date,
    lastUsedAt: Date,
  },
  { timestamps: true }
);

// TTL index: expired sessions are cleaned up by MongoDB automatically.
sessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model("Session", sessionSchema);
