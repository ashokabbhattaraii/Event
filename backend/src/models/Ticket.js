const mongoose = require("mongoose");

const ticketSchema = new mongoose.Schema(
  {
    event: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Event",
      required: true,
    },
    attendee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    organization: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
    },
    qrToken: {
      type: String,
      required: true,
      unique: true,
    },
    status: {
      type: String,
      enum: ["valid", "checked-in", "cancelled"],
      default: "valid",
    },
    checkedInAt: {
      type: Date,
    },
    checkedInBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    cancelledAt: {
      type: Date,
    },
    payment: {
      status: {
        type: String,
        enum: ["none", "pending", "paid", "refunded"],
        default: "none",
      },
      // Which rail actually took the payment — "none" for free events. The
      // amount/currency below reflect what was actually charged (e.g. a
      // Stripe payment on an NPR event is charged in converted USD), while
      // the event's own price stays the source of truth for its listed NPR
      // price.
      provider: {
        type: String,
        enum: ["none", "stripe", "esewa"],
        default: "none",
      },
      amount: { type: Number, default: 0 },
      currency: { type: String, default: "NPR" },
      stripeSessionId: { type: String },
      stripePaymentIntentId: { type: String },
      esewaTransactionUuid: { type: String },
      esewaRefId: { type: String },
    },
  },
  { timestamps: true }
);

ticketSchema.index({ event: 1, attendee: 1 }, { unique: true });

module.exports = mongoose.model("Ticket", ticketSchema);
