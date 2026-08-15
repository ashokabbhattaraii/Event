const mongoose = require("mongoose");

const reminderJobSchema = new mongoose.Schema(
  {
    event: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Event",
      required: true,
    },
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    organization: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
    },
    // Kind of reminder:
    // - "before_event": sent at (event.date - offsetMinutes)
    // - "feedback": sent at (event.date + feedbackDelayHours)
    kind: {
      type: String,
      enum: ["before_event", "feedback"],
      required: true,
    },
    // When this reminder should fire. Computed deterministically from
    // event.date + event.reminderSettings so the scheduler can simply
    // query for jobs where scheduledAt <= now.
    scheduledAt: {
      type: Date,
      required: true,
    },
    // When the reminder was actually dispatched (null = not yet sent).
    // Once set, the job is never re-dispatched.
    sentAt: { type: Date },
    // Which offset (minutes) this job corresponds to; only for kind=before_event.
    // Useful for debugging and deduping; the unique index ensures one job
    // per (event, recipient, kind, offset).
    offsetMinutes: { type: Number },
    // Metadata for the dispatched message (subject, template used, etc.)
    metadata: { type: Object },
  },
  { timestamps: true }
);

// One job per event + recipient + kind + offset (feedback jobs have offset = 0).
reminderJobSchema.index(
  { event: 1, recipient: 1, kind: 1, offsetMinutes: 1 },
  { unique: true }
);

// Query due jobs quickly.
reminderJobSchema.index({ scheduledAt: 1, sentAt: 1 });

module.exports = mongoose.model("ReminderJob", reminderJobSchema);