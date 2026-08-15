const mongoose = require("mongoose");

// An event SCHEDULE session: a talk/workshop/slot that belongs to a specific
// Event (e.g. a "Deep Dive" track slot at a conference). This is distinct from
// an auth refresh-token session (models/Session.js). They were previously the
// same model name, which broke login; this now has its own namespace so the
// auth flow and the event-schedule CRUD can evolve independently.
const eventSessionSchema = new mongoose.Schema(
  {
    event: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Event",
      required: true,
    },
    organization: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
    },
    title: {
      type: String,
      required: [true, "Session title is required"],
      trim: true,
    },
    description: {
      type: String,
      default: "",
      trim: true,
    },
    track: {
      type: String,
      trim: true,
      default: "",
    },
    startTime: {
      type: Date,
      required: [true, "Session start time is required"],
    },
    endTime: {
      type: Date,
      required: [true, "Session end time is required"],
    },
    location: {
      type: String,
      trim: true,
      default: "",
    },
    speakers: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: "Speaker",
    }],
    capacity: {
      type: Number,
      min: 0,
      default: 0, // 0 = unlimited
    },
    registered: {
      type: Number,
      default: 0,
    },
    isPublic: {
      type: Boolean,
      default: true,
    },
    status: {
      type: String,
      enum: ["scheduled", "live", "completed", "cancelled"],
      default: "scheduled",
    },
  },
  { timestamps: true }
);

// Indexes for efficient queries
eventSessionSchema.index({ event: 1, startTime: 1 });
eventSessionSchema.index({ organization: 1 });
eventSessionSchema.index({ track: 1 });

// Prevent overlapping sessions for same track at same event
eventSessionSchema.pre("save", async function (next) {
  if (this.isModified("startTime") || this.isModified("endTime") || this.isModified("track")) {
    const overlap = await this.constructor.findOne({
      _id: { $ne: this._id },
      event: this.event,
      track: this.track,
      status: { $ne: "cancelled" },
      $or: [
        { startTime: { $lt: this.endTime }, endTime: { $gt: this.startTime } },
      ],
    });
    if (overlap) {
      const err = new Error(`Session overlaps with "${overlap.title}" in track "${this.track}"`);
      err.status = 400;
      return next(err);
    }
  }
  next();
});

module.exports = mongoose.model("EventSession", eventSessionSchema);
