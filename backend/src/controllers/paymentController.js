const Stripe = require("stripe");
const Event = require("../models/Event");
const Ticket = require("../models/Ticket");
const User = require("../models/User");
const { claimAndIssueTicket } = require("../utils/ticketing");

// Payments are entirely optional: the app runs fine with STRIPE_SECRET_KEY
// unset (free events work as before), it just returns a clear 503 for the
// checkout endpoint until a real key is configured.
const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY)
  : null;

const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:3000";

// Stripe doesn't support Nepal as a business location or NPR as a charge
// currency — NPR is the app's default (see models/Event.js), so a Stripe
// checkout attempt on an NPR-priced event would otherwise fail with an
// opaque Stripe API error. Fail fast with a clear message instead; a Nepal
// deployment needs a local rail (eSewa, Khalti, Fonepay, ...) for paid
// events, which isn't wired up here.
const STRIPE_UNSUPPORTED_CURRENCIES = new Set(["NPR"]);

const getPaymentConfig = (req, res) => {
  res.json({
    enabled: !!stripe,
    publishableKey: process.env.STRIPE_PUBLISHABLE_KEY || null,
  });
};

const createCheckoutSession = async (req, res) => {
  try {
    if (!stripe) {
      return res.status(503).json({
        message: "Payments are not configured on this server (missing STRIPE_SECRET_KEY)",
      });
    }

    const event = await Event.findById(req.params.id);
    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }
    if (!event.price?.amount || event.price.amount <= 0) {
      return res.status(400).json({ message: "This event is free — register directly instead" });
    }
    if (STRIPE_UNSUPPORTED_CURRENCIES.has((event.price.currency || "").toUpperCase())) {
      return res.status(400).json({
        message: `Stripe doesn't support ${event.price.currency} — this event needs a local payment provider (e.g. eSewa or Khalti) that isn't configured yet`,
      });
    }
    if (event.registered >= event.capacity) {
      return res.status(400).json({ message: "Event is at full capacity" });
    }

    const existing = await Ticket.findOne({
      event: event._id,
      attendee: req.user._id,
      status: { $ne: "cancelled" },
    });
    if (existing) {
      return res.status(400).json({ message: "Already registered for this event" });
    }

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      customer_email: req.user.email,
      line_items: [
        {
          price_data: {
            currency: (event.price.currency || "USD").toLowerCase(),
            product_data: {
              name: event.title,
              description: `Ticket for ${event.title} on ${new Date(event.date).toDateString()}`,
            },
            unit_amount: Math.round(event.price.amount * 100),
          },
          quantity: 1,
        },
      ],
      metadata: {
        eventId: event._id.toString(),
        attendeeId: req.user._id.toString(),
      },
      success_url: `${FRONTEND_URL}/attendee/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${FRONTEND_URL}/attendee/${event._id}?checkout=cancelled`,
    });

    res.json({ url: session.url });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Confirms a completed Checkout Session for the frontend's success page —
// the ticket itself is only ever created by the webhook below (the source of
// truth for "payment actually happened"), so this just reports status.
const getCheckoutStatus = async (req, res) => {
  try {
    if (!stripe) {
      return res.status(503).json({ message: "Payments are not configured on this server" });
    }
    const session = await stripe.checkout.sessions.retrieve(req.params.sessionId);
    if (session.metadata?.attendeeId !== req.user._id.toString()) {
      return res.status(403).json({ message: "Not authorized to view this session" });
    }
    const ticket = await Ticket.findOne({ "payment.stripeSessionId": session.id }).populate("event");
    res.json({ paid: session.payment_status === "paid", ticket: ticket || null });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Mounted with express.raw() (see server.js) so req.body is the raw buffer
// Stripe needs to verify the webhook signature — issuing a ticket only ever
// happens here, never from the client-side "success" redirect, so a user
// can't fake a paid ticket by hitting the success URL directly.
const handleWebhook = async (req, res) => {
  if (!stripe) return res.status(503).end();

  let event;
  try {
    const signature = req.headers["stripe-signature"];
    event = process.env.STRIPE_WEBHOOK_SECRET
      ? stripe.webhooks.constructEvent(req.body, signature, process.env.STRIPE_WEBHOOK_SECRET)
      : JSON.parse(req.body.toString());
  } catch (error) {
    return res.status(400).json({ message: `Webhook signature verification failed: ${error.message}` });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    const { eventId, attendeeId } = session.metadata || {};

    try {
      const [eventDoc, attendee] = await Promise.all([
        Event.findById(eventId),
        User.findById(attendeeId),
      ]);

      if (eventDoc && attendee) {
        const existing = await Ticket.findOne({
          event: eventId,
          attendee: attendeeId,
          status: { $ne: "cancelled" },
        });
        if (!existing) {
          await claimAndIssueTicket({
            event: eventDoc,
            attendeeId,
            attendeeName: attendee.name,
            payment: {
              status: "paid",
              amount: (session.amount_total || 0) / 100,
              currency: (session.currency || "usd").toUpperCase(),
              stripeSessionId: session.id,
              stripePaymentIntentId: session.payment_intent,
            },
          });
        }
      }
    } catch (error) {
      console.error("[stripe webhook] failed to issue ticket:", error.message);
    }
  }

  res.json({ received: true });
};

module.exports = {
  getPaymentConfig,
  createCheckoutSession,
  getCheckoutStatus,
  handleWebhook,
};
