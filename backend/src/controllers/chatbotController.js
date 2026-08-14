const Event = require("../models/Event");
const Ticket = require("../models/Ticket");
const User = require("../models/User");
const { generateReply } = require("../utils/aiProvider");
const { haversineKm, hasValidCoords } = require("../utils/geo");
const predictAttendance = require("../utils/predictAttendance");

const matchIntent = (message) => {
  const m = message.toLowerCase();
  if (/(near me|nearby|close to me|around me|closest|near by)/.test(m)) return "near_me";
  if (/(my ticket|my registration|my bookings)/.test(m)) return "my_tickets";
  if (/(this week|upcoming|what.*events|find events|show events)/.test(m)) return "upcoming_events";
  if (/(venue|where is|location|address)/.test(m)) return "venue";
  if (/(when is|schedule|date|time|what time)/.test(m)) return "schedule";
  if (/(registration status|am i registered|did i register|my status)/.test(m)) return "registration_status";
  if (/(popular|trending|best|top|hot|highest)/.test(m)) return "popular_events";
  if (/(capacity|spots left|how many seats|full|available)/.test(m)) return "capacity";
  if (/(cancel|refund|unregister|remove)/.test(m)) return "cancellation";
  if (/(hi|hello|hey|help|what can you do)/.test(m)) return "greeting";
  if (/(category|type|kind|sort|filter)/.test(m)) return "categories";
  return "fallback";
};

const buildGroundedReply = async (req, intent, eventId) => {
  const orgFilter = { organization: req.user.organization };
  const now = new Date();

  if (intent === "greeting") {
    return "I'm EventBot, your AI event assistant. I can help you find events, check your tickets, get venue info, see what's trending, check capacity, and more. What would you like to know?";
  }

  if (intent === "my_tickets") {
    const tickets = await Ticket.find({ attendee: req.user._id })
      .populate("event", "title date venue type category price")
      .sort({ createdAt: -1 })
      .limit(10);

    if (!tickets.length) {
      return "You don't have any tickets yet. Browse the Discover page to find and register for events!";
    }

    const upcoming = tickets.filter(t => t.event && new Date(t.event.date) > now);
    const past = tickets.filter(t => t.event && new Date(t.event.date) <= now);

    let reply = `You have ${tickets.length} ticket(s): `;
    reply += tickets.map((t, i) => {
      const e = t.event;
      const statusEmoji = t.status === "checked-in" ? "✅" : t.status === "cancelled" ? "❌" : "🎫";
      const dateStr = e ? new Date(e.date).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "";
      return `${i + 1}. ${statusEmoji} ${e?.title || "Unknown"} - ${dateStr} (${t.status})`;
    }).join("; ");

    if (upcoming.length > 0) {
      reply += `. You have ${upcoming.length} upcoming event(s) to attend.`;
    }
    return reply;
  }

  if (intent === "near_me") {
    if (!hasValidCoords(req.user.location)) {
      return "I don't have your location yet. Go to Settings to enable location sharing, then I can find events closest to you!";
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

    let reply = "Events sorted by distance from you:";
    nearby.forEach((e) => {
      const dist = e.km < 1
        ? `${Math.round(e.km * 1000)}m away`
        : `${e.km.toFixed(1)} km away`;
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

    let reply = `There are ${events.length} upcoming event(s):`;
    Object.entries(byMonth).forEach(([month, evts]) => {
      reply += `\n\n📅 ${month}:`;
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

    let reply = "Here are the most popular events right now:";
    events.forEach((e, i) => {
      const predicted = predictAttendance(e);
      const medal = i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i + 1}.`;
      reply += `\n${medal} "${e.title}" — ${e.registered}/${e.capacity} registered (predicted: ${predicted})`;
    });
    return reply;
  }

  if (intent === "capacity") {
    if (!eventId) {
      return "Which event are you asking about? You can ask \"How many spots left for [event name]?\" or open the event page.";
    }
    const event = await Event.findById(eventId);
    if (!event) return "I couldn't find that event.";
    const available = event.capacity - event.registered;
    const predicted = predictAttendance(event);
    return `"${event.title}" has ${event.registered}/${event.capacity} registered (${Math.round((event.registered / event.capacity) * 100)}% full). There ${available === 1 ? "is" : "are"} ${available} spot${available === 1 ? "" : "s"} left. Based on current trends, we expect ${predicted} total attendees.`;
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
    return `Available event categories: ${categories.join(", ")}. You can filter by category on the Discover page.`;
  }

  if (["venue", "schedule", "registration_status"].includes(intent)) {
    if (!eventId) {
      return "Which event are you asking about? Please open the event page and ask again, or mention the event name.";
    }
    const event = await Event.findById(eventId).populate("organizer", "name");
    if (!event) return "I couldn't find that event.";

    if (intent === "venue") {
      const hasCoords = hasValidCoords(event.coordinates);
      let reply = `"${event.title}" is at ${event.venue}.`;
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
      return `"${event.title}" is scheduled for ${d.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })} at ${d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}.`;
    }

    const ticket = await Ticket.findOne({ event: event._id, attendee: req.user._id });
    if (!ticket) {
      return `You are not registered for "${event.title}" yet. Would you like to register?`;
    }
    const statusEmoji = ticket.status === "checked-in" ? "✅" : ticket.status === "cancelled" ? "❌" : "🎫";
    return `You're registered for "${event.title}" (status: ${ticket.status}) ${statusEmoji}. Your ticket ID: ${ticket._id.toString().slice(-6).toUpperCase()}.`;
  }

  return "I'm not sure how to help with that yet. Here's what I can do:\n• Find events near you\n• Show your tickets\n• List upcoming events\n• Check event capacity\n• Find popular/trending events\n• Tell you about venue and schedule\n• Check your registration status\n\nWhat would you like to know?";
};

const query = async (req, res) => {
  try {
    const { message, eventId } = req.body;
    if (!message) {
      return res.status(400).json({ message: "message is required" });
    }

    const intent = matchIntent(message);
    const groundedReply = await buildGroundedReply(req, intent, eventId);

    const userPrompt = `User asked: "${message}"\n\nFacts to use (only these, never invent): ${groundedReply}`;
    const aiReply = await generateReply(SYSTEM_PROMPT, userPrompt);

    res.json({ intent, reply: aiReply || groundedReply });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const SYSTEM_PROMPT =
  "You are EventBot, the helpful AI assistant for EventNexus event platform. " +
  "Rephrase the provided facts into a friendly, natural, and concise reply (1-4 sentences). " +
  "Use emojis sparingly and only where they add clarity (e.g., 🎫 for tickets, 📍 for location, 🔥 for trending). " +
  "Use ONLY the facts provided — never invent event names, dates, numbers, or details that aren't in the facts. " +
  "If the user seems confused, offer to help with specific capabilities like finding events or checking tickets.";

module.exports = { query };
