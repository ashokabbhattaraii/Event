const mongoose = require("mongoose");

const eventSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Event title is required"],
      trim: true,
    },
    description: {
      type: String,
      default: "",
    },
    date: {
      type: Date,
      required: [true, "Event date is required"],
    },
    venue: {
      type: String,
      required: [true, "Venue is required"],
      trim: true,
    },
    // Optional geo-coordinates of the venue, used to rank events by distance
    // from an attendee's saved location.
    coordinates: {
      lat: { type: Number },
      lng: { type: Number },
      // GeoJSON mirror of lat/lng (kept in sync below), indexed with
      // 2dsphere so "notify people near this event" is a real geo query
      // instead of an application-level scan.
      // No defaults — see the matching comment on User.location.geo.
      geo: {
        type: { type: String, enum: ["Point"] },
        coordinates: { type: [Number] },
      },
    },
    type: {
      type: String,
      enum: ["In-person", "Hybrid", "Virtual"],
      default: "In-person",
    },
    category: {
      type: String,
      required: [true, "Category is required"],
      trim: true,
    },
    capacity: {
      type: Number,
      required: [true, "Capacity is required"],
      min: 1,
    },
    // Structured price so payment amounts are computable server-side (not a
    // free-text label). amount === 0 means the event is free — registration
    // skips the payment flow entirely in that case.
    price: {
      amount: { type: Number, default: 0, min: 0 },
      currency: { type: String, default: "USD", uppercase: true, trim: true },
    },
    status: {
      type: String,
      enum: ["Upcoming", "Live", "Past", "Draft"],
      default: "Draft",
    },
    organizer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    organization: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
    },
    registered: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

eventSchema.index({ "coordinates.geo": "2dsphere" });

eventSchema.pre("save", function (next) {
  if (this.isModified("coordinates") && this.coordinates?.lat != null && this.coordinates?.lng != null) {
    this.coordinates.geo = { type: "Point", coordinates: [this.coordinates.lng, this.coordinates.lat] };
  }
  next();
});

module.exports = mongoose.model("Event", eventSchema);
