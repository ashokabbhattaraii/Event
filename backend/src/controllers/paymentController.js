const Stripe = require("stripe");
const Event = require("../models/Event");
const Ticket = require("../models/Ticket");
const User = require("../models/User");
const { issueTicketOnce } = require("../utils/ticketing");
const { createNotification } = require("./notificationController");
const { sendMail } = require("../utils/email");
const { generateQRCodeDataURI } = require("../utils/qrCode");
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
    if (event.status === "Draft") {
      return res.status(400).json({ message: "This event is not open for registration yet" });
    }
    if (new Date(event.date) <= new Date()) {
      return res.status(400).json({ message: "This event has already started" });
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
      success_url: `${FRONTEND_URL}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${FRONTEND_URL}/events/${event._id}?checkout=cancelled`,
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

  // Signature verification is mandatory — without STRIPE_WEBHOOK_SECRET the
  // endpoint must refuse to run, otherwise anyone could POST a forged
  // checkout.session.completed event and mint free tickets. (The previous
  // JSON.parse fallback silently skipped verification.)
  if (!process.env.STRIPE_WEBHOOK_SECRET) {
    return res
      .status(400)
      .json({ message: "Stripe webhook secret is not configured on this server" });
  }

  let event;
  try {
    const signature = req.headers["stripe-signature"];
    event = stripe.webhooks.constructEvent(
      req.body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (error) {
    return res.status(400).json({ message: `Webhook signature verification failed: ${error.message}` });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    const { eventId, attendeeId } = session.metadata || {};

    // checkout.session.completed also fires for sessions whose payment
    // ended up "unpaid"/"processing" (async payment methods, later
    // failures). Issuing a ticket in those cases would mint free tickets —
    // only "paid" counts.
    if (session.payment_status !== "paid") {
      console.error(
        `[stripe webhook] ignoring ${event.type} for session ${session.id} with payment_status "${session.payment_status}"`
      );
      return res.json({ received: true });
    }

    if (!eventId || !attendeeId) {
      console.error(`[stripe webhook] session ${session.id} has no eventId/attendeeId metadata`);
      return res.json({ received: true });
    }

    try {
      const [eventDoc, attendee] = await Promise.all([
        Event.findById(eventId),
        User.findById(attendeeId),
      ]);

      if (eventDoc && attendee) {
        // Idempotent: a webhook retry for the same session finds the ticket
        // already issued and returns it instead of failing on the unique index.
        const ticket = await issueTicketOnce({
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

        // Send confirmation email with QR code
        try {
          const qrCodeDataUri = await generateQRCodeDataURI(ticket.qrToken);
          await sendMail({
            to: attendee.email,
            subject: `Registration confirmed: ${eventDoc.title}`,
            template: "ticket-confirmation",
            templateData: {
              name: attendee.name,
              eventTitle: eventDoc.title,
              eventDate: new Date(eventDoc.date).toLocaleDateString("en-US", { dateStyle: "full" }),
              eventTime: new Date(eventDoc.date).toLocaleTimeString("en-US", { timeStyle: "short" }),
              venue: eventDoc.venue || "TBA",
              eventType: eventDoc.type || "In-person",
              ticketType: "Paid",
              quantity: 1,
              orderId: ticket._id.toString().slice(-8).toUpperCase(),
              eventId: eventDoc._id,
              qrCodeUrl: qrCodeDataUri,
            },
            metadata: { ticketId: ticket._id, eventId: eventDoc._id, stripeSessionId: session.id },
          });
        } catch (mailErr) {
          console.error("[stripe webhook] Failed to send confirmation email:", mailErr.message);
        }
      }
    } catch (error) {
      console.error("[stripe webhook] failed to issue ticket:", error.message);
    }
  }

  // Full refund: the ticket's payment is marked refunded and the ticket
  // itself cancelled (releasing its capacity slot) so the attendee can't
  // walk in with a QR for a purchase that was reversed. The refunded status
  // existed on the model but nothing ever set it — refunds used to leave
  // the ticket valid indefinitely. Partial refunds (amount_refunded <
  // amount) only update the payment record; the ticket stays usable.
  if (event.type === "charge.refunded") {
    const charge = event.data.object;
    const paymentIntentId = charge.payment_intent;

    try {
      const ticket = await Ticket.findOne({
        "payment.stripePaymentIntentId": paymentIntentId,
      }).populate("event");

      if (!ticket) {
        console.error(`[stripe webhook] no ticket found for payment intent ${paymentIntentId}`);
        return res.json({ received: true });
      }

      const fullyRefunded =
        Number(charge.amount_refunded) >= Number(charge.amount_captured || charge.amount);

      if (ticket.payment.status === "refunded" || ticket.status === "cancelled") {
        // Idempotent — Stripe may deliver the same refund more than once.
        return res.json({ received: true });
      }

      ticket.payment.status = "refunded";
      ticket.payment.amountRefunded = Number(charge.amount_refunded) / 100;

      if (fullyRefunded && ticket.status !== "checked-in") {
        ticket.status = "cancelled";
        ticket.cancelledAt = new Date();
        if (ticket.event) {
          await Event.updateOne(
            { _id: ticket.event._id, registered: { $gt: 0 } },
            { $inc: { registered: -1 } }
          );
          await createNotification({
            recipient: ticket.attendee,
            organization: ticket.organization,
            type: "registration",
            title: "Payment refunded",
            message: `Your payment for ${ticket.event.title} was refunded and your ticket cancelled.`,
            event: ticket.event._id,
            link: "/my-tickets",
          });
        }
      }

      await ticket.save();
    } catch (error) {
      console.error("[stripe webhook] failed to process refund:", error.message);
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
    if (event.status === "Draft") {
      return res.status(400).json({ message: "This event is not open for registration yet" });
    }
    if (new Date(event.date) <= new Date()) {
      return res.status(400).json({ message: "This event has already started" });
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
      // eventId in the path so the frontend can offer a "pay with card
      // instead" fallback on failure/cancel without needing to decode
      // eSewa's signed payload (which doesn't exist for a plain cancel).
      successUrl: `${baseUrl}/api/payments/esewa/success/${event._id}`,
      failureUrl: `${baseUrl}/api/payments/esewa/failure/${event._id}`,
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
  const eventIdParam = req.params.eventId ? `&eventId=${req.params.eventId}` : "";
  const fail = (reason) =>
    res.redirect(`${FRONTEND_URL}/checkout/success?provider=esewa&error=${reason}${eventIdParam}`);

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
      // Idempotent: a duplicated eSewa callback returns the already-issued
      // ticket instead of erroring on the unique index.
      ticket = await issueTicketOnce({
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

    // Send confirmation email with QR code
    try {
      const qrCodeDataUri = await generateQRCodeDataURI(ticket.qrToken);
      await sendMail({
        to: attendee.email,
        subject: `Registration confirmed: ${eventDoc.title}`,
        template: "ticket-confirmation",
        templateData: {
          name: attendee.name,
          eventTitle: eventDoc.title,
          eventDate: new Date(eventDoc.date).toLocaleDateString("en-US", { dateStyle: "full" }),
          eventTime: new Date(eventDoc.date).toLocaleTimeString("en-US", { timeStyle: "short" }),
          venue: eventDoc.venue || "TBA",
          eventType: eventDoc.type || "In-person",
          ticketType: "Paid",
          quantity: 1,
          orderId: ticket._id.toString().slice(-8).toUpperCase(),
          eventId: eventDoc._id,
          qrCodeUrl: qrCodeDataUri,
        },
        metadata: { ticketId: ticket._id, eventId: eventDoc._id, provider: "esewa" },
      });
    } catch (mailErr) {
      console.error("[esewa] Failed to send confirmation email:", mailErr.message);
    }

    res.redirect(`${FRONTEND_URL}/checkout/success?provider=esewa&ticketId=${ticket._id}`);
  } catch (error) {
    console.error("[esewa] success handling failed:", error.message);
    fail("server");
  }
};

const handleEsewaFailure = (req, res) => {
  const eventIdParam = req.params.eventId ? `&eventId=${req.params.eventId}` : "";
  res.redirect(`${FRONTEND_URL}/checkout/success?provider=esewa&error=cancelled${eventIdParam}`);
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
