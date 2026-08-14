const Event = require("../models/Event");
const Ticket = require("../models/Ticket");
const { haversineKm, hasValidCoords } = require("../utils/geo");
const predictAttendance = require("../utils/predictAttendance");

const matchIntent = (message) => {
  const m = message.toLowerCase();
  if (/(near me|nearby|close to me|around me|closest|near by)/.test(m)) return "near_me";
  if (/(my ticket|my registration|my bookings)/.test(m)) return "my_tickets";
  // Checked before "capacity" (which also matches "available") and before
  // "upcoming_events" so "any free events?" doesn't get swallowed by the
  // more generic "what events are there" match.
  if (/(\bfree\b|no cost|complimentary|\bcost\b|\bprice\b|pricing|how much|paid event|ticket price|is it free)/.test(m)) return "pricing";
  if (/(who\b.{0,15}\b(organiz|host|run)|organizer of|host of|hosted by)/.test(m)) return "organizer";
  if (/(this week|upcoming|what.*events|find events|show events)/.test(m)) return "upcoming_events";
  if (/(venue|where is|location|address|held at|taking place)/.test(m)) return "venue";
  if (/(when is|schedule|date|time|what time|starts at|start time)/.test(m)) return "schedule";
  if (/(registration status|am i registered|did i register|my status)/.test(m)) return "registration_status";
  if (/(popular|trending|best|top|hot|highest)/.test(m)) return "popular_events";
  if (/(capacity|spots left|how many seats|how many people|sold out|full|available)/.test(m)) return "capacity";
  if (/(cancel|refund|unregister|remove)/.test(m)) return "cancellation";
  if (/(hi|hello|hey|help|what can you do)/.test(m)) return "greeting";
  if (/(category|type|kind|sort|filter)/.test(m)) return "categories";
  return "fallback";
};

// NPR is the app's default currency (see models/Event.js); mirrors
// frontend/lib/price.ts's formatting since the backend can't import it.
const formatEventPrice = (price) => {
  if (!price || !price.amount) return "Free";
  const currency = (price.currency || "NPR").toUpperCase();
  if (currency === "NPR") return `Rs. ${price.amount.toLocaleString("en-US")}`;
  return `${currency} ${price.amount}`;
};

// Resolves the event a free-text message is actually about (e.g. "how many
// spots left for Tech Conference?") when the caller didn't supply an
// eventId from page context. Deterministic word-overlap scoring — never an
// LLM guess — and deliberately returns null instead of picking when two
// events match about equally well, so the bot asks for clarification rather
// than confidently answering about the wrong event.
const resolveEventFromMessage = async (message, orgFilter) => {
  const events = await Event.find(orgFilter).select("_id title").limit(300).lean();
  if (!events.length) return null;

  const m = message.toLowerCase();
  const scored = events
    .map((e) => {
      const title = e.title.toLowerCase();
      if (m.includes(title)) return { event: e, score: 1 };
      const words = title.split(/\s+/).filter((w) => w.length > 2);
      if (!words.length) return { event: e, score: 0 };
      const matched = words.filter((w) => m.includes(w)).length;
      return { event: e, score: matched / words.length };
    })
    .filter((s) => s.score >= 0.6)
    .sort((a, b) => b.score - a.score);

  if (!scored.length) return null;
  if (scored.length > 1 && scored[0].score - scored[1].score < 0.2) return null; // ambiguous — don't guess
  return scored[0].event;
};

// Shared by every intent that needs a specific event: prefer the page-context
// eventId, fall back to resolving one from the message text, and never
// silently guess — callers get null and ask the user to clarify.
const resolveEvent = async (eventId, message, orgFilter) => {
  if (eventId) return Event.findById(eventId).populate("organizer", "name");
  const fromText = await resolveEventFromMessage(message, orgFilter);
  return fromText ? Event.findById(fromText._id).populate("organizer", "name") : null;
};

const NEED_EVENT_HINT =
  'Which event do you mean? Try naming it — e.g. "how many spots left for Tech Conference?" — or open the event page first.';

const buildGroundedReply = async (req, intent, eventId, message) => {
  const orgFilter = { organization: req.user.organization };
  const now = new Date();

  if (intent === "greeting") {
    return "Hi! I'm EventBot 👋 — ask me about free vs. paid events, capacity, venues, schedules, your tickets, or what's trending. What would you like to know?";
  }

  if (intent === "my_tickets") {
    const tickets = await Ticket.find({ attendee: req.user._id })
      .populate("event", "title date venue type category price")
      .sort({ createdAt: -1 })
      .limit(10);

    if (!tickets.length) {
      return "You don't have any tickets yet 🎫 — browse the Discover page to find and register for events!";
    }

    const upcoming = tickets.filter((t) => t.event && new Date(t.event.date) > now);

    let reply = `You have ${tickets.length} ticket${tickets.length === 1 ? "" : "s"}: `;
    reply += tickets
      .map((t, i) => {
        const e = t.event;
        const statusEmoji = t.status === "checked-in" ? "✅" : t.status === "cancelled" ? "❌" : "🎫";
        const dateStr = e ? new Date(e.date).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "";
        return `${i + 1}. ${statusEmoji} ${e?.title || "Unknown"} - ${dateStr} (${t.status})`;
      })
      .join("; ");

    if (upcoming.length > 0) {
      reply += `. You have ${upcoming.length} upcoming event${upcoming.length === 1 ? "" : "s"} to attend.`;
    }
    return reply;
  }

  if (intent === "near_me") {
    if (!hasValidCoords(req.user.location)) {
      return "I don't have your location yet 📍 — go to Settings to enable location sharing, then I can find events closest to you!";
    }
    const events = await Event.find({
      ...orgFilter,
      status: { $in: ["Upcoming", "Live"] },
      date: { $gte: now },
      "coordinates.lat": { $ne: null },
    }).populate("organizer", "name");

    const nearby = events
      .map((e) => ({
        title: e.title,
        venue: e.venue,
        km: haversineKm(req.user.location, e.coordinates),
        date: e.date,
        category: e.category,
      }))
      .filter((e) => e.km != null)
      .sort((a, b) => a.km - b.km)
      .slice(0, 5);

    if (!nearby.length) {
      return "I couldn't find any upcoming events with location data near you. Try checking back later or browse all events on the Discover page.";
    }

    let reply = "📍 Events sorted by distance from you:";
    nearby.forEach((e) => {
      const dist = e.km < 1 ? `${Math.round(e.km * 1000)}m away` : `${e.km.toFixed(1)} km away`;
      reply += `\n• ${e.title} at ${e.venue} — ${dist} (${e.category})`;
    });
    reply += `\n\nThe closest event is "${nearby[0].title}" just ${nearby[0].km < 1 ? `${Math.round(nearby[0].km * 1000)}m` : `${nearby[0].km.toFixed(1)} km`} away!`;
    return reply;
  }

  if (intent === "upcoming_events") {
    const events = await Event.find({
      ...orgFilter,
      status: { $in: ["Upcoming", "Live"] },
      date: { $gte: now },
    })
      .sort({ date: 1 })
      .limit(8)
      .populate("organizer", "name");

    if (!events.length) {
      return "No upcoming events found for your organization right now. Check back soon for new events!";
    }

    const byMonth = {};
    events.forEach((e) => {
      const month = new Date(e.date).toLocaleString("en-US", { month: "long", year: "numeric" });
      if (!byMonth[month]) byMonth[month] = [];
      byMonth[month].push(e);
    });

    let reply = `📅 There ${events.length === 1 ? "is" : "are"} ${events.length} upcoming event${events.length === 1 ? "" : "s"}:`;
    Object.entries(byMonth).forEach(([month, evts]) => {
      reply += `\n\n${month}:`;
      evts.forEach((e) => {
        const pct = Math.round((e.registered / e.capacity) * 100);
        const fillEmoji = pct >= 80 ? "🔥" : pct >= 50 ? "📈" : "📊";
        reply += `\n  ${fillEmoji} "${e.title}" — ${new Date(e.date).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })} at ${e.venue} (${pct}% full)`;
      });
    });
    return reply;
  }

  if (intent === "popular_events") {
    const events = await Event.find({
      ...orgFilter,
      status: { $in: ["Upcoming", "Live"] },
      date: { $gte: now },
    })
      .sort({ registered: -1 })
      .limit(5);

    if (!events.length) {
      return "No events found at the moment.";
    }

    let reply = "🔥 Here are the most popular events right now:";
    events.forEach((e, i) => {
      const predicted = predictAttendance(e);
      const medal = i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i + 1}.`;
      reply += `\n${medal} "${e.title}" — ${e.registered}/${e.capacity} registered (predicted: ${predicted})`;
    });
    return reply;
  }

  if (intent === "pricing") {
    const event = await resolveEvent(eventId, message, orgFilter);
    if (event) {
      const priceLabel = formatEventPrice(event.price);
      return event.price?.amount > 0
        ? `💰 "${event.title}" costs ${priceLabel} per ticket. You can pay securely by card at checkout.`
        : `🎉 "${event.title}" is free — no payment needed, just register.`;
    }

    const [free, paid] = await Promise.all([
      Event.find({ ...orgFilter, status: { $in: ["Upcoming", "Live"] }, date: { $gte: now }, "price.amount": 0 })
        .sort({ date: 1 })
        .limit(6),
      Event.find({ ...orgFilter, status: { $in: ["Upcoming", "Live"] }, date: { $gte: now }, "price.amount": { $gt: 0 } })
        .sort({ date: 1 })
        .limit(6),
    ]);

    if (!free.length && !paid.length) {
      return "There are no upcoming events to price right now. Check back soon!";
    }

    const fmt = (e) => `"${e.title}" (${new Date(e.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })})`;

    let reply = "";
    if (free.length) {
      reply += `🎉 Free events: ${free.map(fmt).join(", ")}.`;
    } else {
      reply += "No free events right now.";
    }
    if (paid.length) {
      reply += ` 💰 Paid events: ${paid.map((e) => `"${e.title}" — ${formatEventPrice(e.price)}`).join(", ")}.`;
    }
    return reply;
  }

  if (intent === "organizer") {
    const event = await resolveEvent(eventId, message, orgFilter);
    if (!event) return NEED_EVENT_HINT;
    const organizerName = (typeof event.organizer === "object" && event.organizer?.name) || "the event organizer";
    return `"${event.title}" is organized by ${organizerName}.`;
  }

  if (intent === "capacity") {
    const event = await resolveEvent(eventId, message, orgFilter);
    if (!event) return NEED_EVENT_HINT;
    const available = event.capacity - event.registered;
    const predicted = predictAttendance(event);
    const pct = Math.round((event.registered / event.capacity) * 100);
    if (available <= 0) {
      return `🚫 "${event.title}" is fully booked (${event.registered}/${event.capacity}). Check back in case a spot opens up from a cancellation.`;
    }
    return `"${event.title}" has ${event.registered}/${event.capacity} registered (${pct}% full). There ${available === 1 ? "is" : "are"} ${available} spot${available === 1 ? "" : "s"} left. Based on current trends, we expect ${predicted} total attendees.`;
  }

  if (intent === "cancellation") {
    if (!eventId) {
      return "You can cancel any upcoming registration yourself — open My Tickets and tap Cancel on the ticket you no longer need.";
    }
    const ticket = await Ticket.findOne({ event: eventId, attendee: req.user._id });
    if (!ticket) {
      return "You are not registered for this event, so there is nothing to cancel.";
    }
    if (ticket.status === "cancelled") {
      return "Your registration for this event is already cancelled.";
    }
    if (ticket.status === "checked-in") {
      return "This ticket is already checked in, so it can no longer be cancelled.";
    }
    return `You're registered for this event (status: ${ticket.status}). Go to My Tickets and tap Cancel to self-cancel — it's instant and frees your spot for someone else.`;
  }

  if (intent === "categories") {
    const categories = await Event.distinct("category", { ...orgFilter, status: { $in: ["Upcoming", "Live"] } });
    if (!categories.length) return "No categories found.";
    return `🏷️ Available event categories: ${categories.join(", ")}. You can filter by category on the Discover page.`;
  }

  if (["venue", "schedule", "registration_status"].includes(intent)) {
    const event = await resolveEvent(eventId, message, orgFilter);
    if (!event) return NEED_EVENT_HINT;

    if (intent === "venue") {
      const hasCoords = hasValidCoords(event.coordinates);
      let reply = `📍 "${event.title}" is at ${event.venue}.`;
      if (hasCoords) {
        reply += ` Coordinates: ${event.coordinates.lat.toFixed(4)}, ${event.coordinates.lng.toFixed(4)}.`;
        if (hasValidCoords(req.user.location)) {
          const dist = haversineKm(req.user.location, event.coordinates);
          reply += ` It's ${dist < 1 ? `${Math.round(dist * 1000)}m` : `${dist.toFixed(1)} km`} from your location.`;
        }
      }
      return reply;
    }

    if (intent === "schedule") {
      const d = new Date(event.date);
      return `🗓️ "${event.title}" is scheduled for ${d.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })} at ${d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}.`;
    }

    const ticket = await Ticket.findOne({ event: event._id, attendee: req.user._id });
    if (!ticket) {
      return `You are not registered for "${event.title}" yet. Would you like to register?`;
    }
    const statusEmoji = ticket.status === "checked-in" ? "✅" : ticket.status === "cancelled" ? "❌" : "🎫";
    return `You're registered for "${event.title}" (status: ${ticket.status}) ${statusEmoji}. Your ticket ID: ${ticket._id.toString().slice(-6).toUpperCase()}.`;
  }

  return "I'm not sure how to help with that yet 🤔 Here's what I can do:\n• 📍 Find events near you\n• 🎫 Show your tickets\n• 📅 List upcoming events\n• 💰 Check free vs. paid pricing\n• 👥 Check event capacity\n• 🔥 Find popular/trending events\n• 🗺️ Tell you about venue and schedule\n• ✅ Check your registration status\n\nWhat would you like to know?";
};

// The reply is the grounded, DB-computed fact string returned verbatim —
// no LLM rephrasing step. That used to run every grounded reply through
// generateReply() (Groq/Gemini) to "sound more natural," but a small
// instant-tier model paraphrasing a multi-fact sentence (e.g. "these events
// are free, these are paid, these cost X") would routinely drop or garble
// facts, or shuffle a price onto the wrong event's name — same question,
// different (and sometimes wrong) answer on repeat asks. Grounded replies
// are already written as complete, friendly sentences with light emoji, so
// nothing is lost by returning them directly; what's gained is that every
// answer is exactly reproducible from the database.
const query = async (req, res) => {
  try {
    const { message, eventId } = req.body;
    if (!message) {
      return res.status(400).json({ message: "message is required" });
    }

    const intent = matchIntent(message);
    const reply = await buildGroundedReply(req, intent, eventId, message);

    res.json({ intent, reply });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { query };
