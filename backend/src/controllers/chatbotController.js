const Event = require("../models/Event");
const Ticket = require("../models/Ticket");
const { generateReply } = require("../utils/aiProvider");

// Rule-based FAQ intent matching over real event/ticket data. This produces a
// grounded, always-correct answer independent of any external service. It is
// also the fallback if the LLM phrasing layer below is unconfigured or fails.
const matchIntent = (message) => {
  const m = message.toLowerCase();
  if (/(my ticket|my registration)/.test(m)) return "my_tickets";
  if (/(this week|upcoming|what.*events|find events)/.test(m)) return "upcoming_events";
  if (/(venue|where is|location)/.test(m)) return "venue";
  if (/(when is|schedule|date|time)/.test(m)) return "schedule";
  if (/(registration status|am i registered|did i register)/.test(m)) return "registration_status";
  return "fallback";
};

const buildGroundedReply = async (req, intent, eventId) => {
  if (intent === "my_tickets") {
    const tickets = await Ticket.find({ attendee: req.user._id })
      .populate("event", "title date")
      .limit(5);
    return tickets.length
      ? `You have ${tickets.length} ticket(s): ${tickets
          .map((t) => t.event?.title)
          .filter(Boolean)
          .join(", ")}.`
      : "You don't have any tickets yet. Browse events to register.";
  }

  if (intent === "upcoming_events") {
    const events = await Event.find({
      organization: req.user.organization,
      status: { $in: ["Upcoming", "Live"] },
      date: { $gte: new Date() },
    })
      .sort({ date: 1 })
      .limit(5);
    return events.length
      ? `Upcoming events: ${events.map((e) => e.title).join(", ")}.`
      : "No upcoming events found for your organization right now.";
  }

  if (["venue", "schedule", "registration_status"].includes(intent)) {
    if (!eventId) {
      return "Which event are you asking about? Open the event page and ask again.";
    }
    const event = await Event.findById(eventId);
    if (!event) return "I couldn't find that event.";
    if (intent === "venue") return `${event.title} is at ${event.venue}.`;
    if (intent === "schedule") return `${event.title} is on ${new Date(event.date).toLocaleString()}.`;

    const ticket = await Ticket.findOne({ event: event._id, attendee: req.user._id });
    return ticket
      ? `You're registered for ${event.title} (status: ${ticket.status}).`
      : `You're not registered for ${event.title} yet.`;
  }

  return "I'm not sure about that yet — try asking about upcoming events, your tickets, or a specific event's schedule and venue.";
};

const SYSTEM_PROMPT =
  "You are EventBot, the assistant for the EventNexus event platform. " +
  "Rephrase the given facts into a friendly, concise reply (1-3 sentences). " +
  "Use ONLY the facts provided — never invent event names, dates, or details that aren't there.";

const query = async (req, res) => {
  try {
    const { message, eventId } = req.body;
    if (!message) {
      return res.status(400).json({ message: "message is required" });
    }

    const intent = matchIntent(message);
    const groundedReply = await buildGroundedReply(req, intent, eventId);

    const userPrompt = `User asked: "${message}"\n\nFacts: ${groundedReply}`;
    const aiReply = await generateReply(SYSTEM_PROMPT, userPrompt);

    res.json({ intent, reply: aiReply || groundedReply });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { query };
