const Stripe = require("stripe");
const Event = require("../models/Event");
const Ticket = require("../models/Ticket");
const User = require("../models/User");
const { claimAndIssueTicket } = require("../utils/ticketing");
const { nprToUsd, NPR_USD_RATE } = require("../utils/currency");
const esewa = require("../utils/esewa");

// Payments are entirely optional: the app runs fine with STRIPE_SECRET_KEY
// unset (free events work as before), it just returns a clear 503 for the
// checkout endpoint until a real key is configured.
const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY)
  : null;

const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:3000";

// eSewa is always available: unlike Stripe it needs no live secret key to
// exercise end-to-end, since utils/esewa.js falls back to eSewa's own
// published UAT/sandbox test credentials when ESEWA_SECRET_KEY isn't set.
const getPaymentConfig = (req, res) => {
  res.json({
    enabled: !!stripe,
    publishableKey: process.env.STRIPE_PUBLISHABLE_KEY || null,
    esewaEnabled: true,
    nprUsdRate: NPR_USD_RATE,
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

    // Stripe can't settle in NPR, so an NPR-priced event is billed to the
    // card in a converted USD amount instead of failing outright — the
    // event's own listed price (and everything else about it) stays in NPR.
    const originalCurrency = (event.price.currency || "USD").toUpperCase();
    const isNpr = originalCurrency === "NPR";
    const chargeCurrency = isNpr ? "usd" : originalCurrency.toLowerCase();
    const chargeAmount = isNpr ? nprToUsd(event.price.amount) : event.price.amount;

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      customer_email: req.user.email,
      line_items: [
        {
          price_data: {
            currency: chargeCurrency,
            product_data: {
              name: event.title,
              description: isNpr
                ? `Ticket for ${event.title} on ${new Date(event.date).toDateString()} (converted from Rs. ${event.price.amount})`
                : `Ticket for ${event.title} on ${new Date(event.date).toDateString()}`,
            },
            unit_amount: Math.round(chargeAmount * 100),
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

    res.json({ url: session.url, chargeAmount, chargeCurrency: chargeCurrency.toUpperCase() });
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
              provider: "stripe",
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

// eSewa checkout is initiated by the browser auto-submitting a real HTML
// form (not fetch) directly to eSewa's gateway, so this just returns the
// signed field set for the frontend to POST — mirroring how Stripe's
// session.url is handed back for a full-page redirect.
const initiateEsewaPayment = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }
    if (!event.price?.amount || event.price.amount <= 0) {
      return res.status(400).json({ message: "This event is free — register directly instead" });
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

    const baseUrl = `${req.protocol}://${req.get("host")}`;
    const { action, fields } = esewa.buildPaymentForm({
      amount: event.price.amount,
      eventId: event._id.toString(),
      attendeeId: req.user._id.toString(),
      successUrl: `${baseUrl}/api/payments/esewa/success`,
      failureUrl: `${baseUrl}/api/payments/esewa/failure`,
    });

    res.json({ action, fields });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// eSewa redirects the browser here (GET, unauthenticated — the user's
// session cookie/JWT isn't sent along) with a base64 `data` query param.
// Ticket issuance only ever happens after (a) verifying that payload's
// signature and (b) an independent server-to-server status check against
// eSewa's API — never from the redirect alone — the same "redirect is not
// proof of payment" principle the Stripe webhook above is built on.
const handleEsewaSuccess = async (req, res) => {
  const fail = (reason) => res.redirect(`${FRONTEND_URL}/attendee/checkout/success?provider=esewa&error=${reason}`);

  try {
    const raw = req.query.data;
    if (!raw) return fail("missing_data");

    let decoded;
    try {
      decoded = JSON.parse(Buffer.from(String(raw), "base64").toString("utf-8"));
    } catch {
      return fail("invalid_data");
    }

    if (!esewa.verifyResponse(decoded)) return fail("signature");
    if (decoded.status !== "COMPLETE") return fail("not_complete");

    const { eventId, attendeeId } = esewa.parseTransactionUuid(decoded.transaction_uuid);
    if (!eventId || !attendeeId) return fail("bad_transaction");

    const statusCheck = await esewa.checkStatus({
      transactionUuid: decoded.transaction_uuid,
      totalAmount: decoded.total_amount,
    });
    if (statusCheck.status !== "COMPLETE") return fail("unconfirmed");

    const [eventDoc, attendee] = await Promise.all([
      Event.findById(eventId),
      User.findById(attendeeId),
    ]);
    if (!eventDoc || !attendee) return fail("not_found");

    let ticket = await Ticket.findOne({
      event: eventId,
      attendee: attendeeId,
      status: { $ne: "cancelled" },
    });

    if (!ticket) {
      ticket = await claimAndIssueTicket({
        event: eventDoc,
        attendeeId,
        attendeeName: attendee.name,
        payment: {
          status: "paid",
          provider: "esewa",
          amount: Number(decoded.total_amount),
          currency: "NPR",
          esewaTransactionUuid: decoded.transaction_uuid,
          esewaRefId: statusCheck.ref_id || decoded.transaction_code,
        },
      });
    }

    res.redirect(`${FRONTEND_URL}/attendee/checkout/success?provider=esewa&ticketId=${ticket._id}`);
  } catch (error) {
    console.error("[esewa] success handling failed:", error.message);
    fail("server");
  }
};

const handleEsewaFailure = (req, res) => {
  res.redirect(`${FRONTEND_URL}/attendee/checkout/success?provider=esewa&error=cancelled`);
};

module.exports = {
  getPaymentConfig,
  createCheckoutSession,
  getCheckoutStatus,
  handleWebhook,
  initiateEsewaPayment,
  handleEsewaSuccess,
  handleEsewaFailure,
};
