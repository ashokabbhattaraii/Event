const Event = require("../models/Event");
const Ticket = require("../models/Ticket");
const { haversineKm, hasValidCoords } = require("../utils/geo");
const predictAttendance = require("../utils/predictAttendance");
const { generateReply } = require("../utils/aiProvider");
const { scoreEvents } = require("../utils/recommendationEngine");
const ai = require("../utils/aiClient");

const INTENTS = [
  "recommend",
  "near_me",
  "my_tickets",
  "pricing",
  "organizer",
  "upcoming_events",
  "venue",
  "schedule",
  "registration_status",
  "popular_events",
  "capacity",
  "cancellation",
  "greeting",
  "categories",
  "event_count",
  "fallback",
];

// Event detail pages live at /event/:id (public) — the landing spot that
// works for every role, signed in or not. Grounded replies link real events
// so the attendee can jump straight to the page instead of copying the name.
const eventLink = (event) => `[${event.title}](/event/${event._id})`;

const matchIntent = (message) => {
  const m = message.toLowerCase().trim();
  if (/(\brecommend\b|\bsuggest\b|what should i (attend|go to)|what.*should.*attend|pick.*for me|top picks|best.*for me|recommendations)/.test(m)) return "recommend";
  if (/\b(near me|nearby|close to me|around me|closest|near by)\b/.test(m)) return "near_me";
  if (/\b(my ticket|my tickets|my registration|my registrations|my bookings|my booking|how many tickets|how many registrations)\b/.test(m)) return "my_tickets";
  // Checked before "capacity" (which also matches "available") and before
  // "upcoming_events" so "any free events?" doesn't get swallowed by the
  // more generic "what events are there" match.
  if (/(\bfree\b|no cost|complimentary|\bcost\b|\bprice\b|pricing|how much|paid event|ticket price|is it free)/.test(m)) return "pricing";
  if (/(who\b.{0,15}\b(organiz|host|run)|organizer of|host of|hosted by)/.test(m)) return "organizer";
  // Counting questions ("how many events are there total?") must not fall
  // through to the generic upcoming-events list — checked before
  // upcoming_events so "how many events are coming up?" also lands here.
  if (/(\bhow many\b|\btotal\b|\bcount\b|number of).{0,25}\bevents?\b/.test(m) && !/\bvenues?\b|\btickets?\b|\busers?\b|\bspeakers?\b|\bcategories?\b/.test(m)) return "event_count";
  if (
    /(this week|\bupcoming\b|latest event|latest events|\bnew event\b|\bnew events\b|any event|any events|list events|what.*events|find events|show events|events happening|what's on|whats on|any updates)/.test(m)
  )
    return "upcoming_events";
  if (/(\bvenue\b|where is|\blocation\b|\baddress\b|held at|taking place)/.test(m)) return "venue";
  if (/(when is|\bschedule\b|\bdate\b|\btime\b|what time|starts at|start time)/.test(m)) return "schedule";
  if (/(registration status|am i registered|did i register|my status)/.test(m)) return "registration_status";
  if (/(\bpopular\b|\btrending\b|\bbest\b|\btop\b|\bhot\b|highest)/.test(m)) return "popular_events";
  if (/(\bcapacity\b|spots left|how many seats|how many people|sold out|\bfull\b|\bavailable\b)/.test(m)) return "capacity";
  if (/(\bcancel\b|\brefund\b|unregister|\bremove\b)/.test(m)) return "cancellation";
  // Word-boundaried so "hi" doesn't match inside unrelated words like
  // "this", "which", or "anything" and hijack their real intent.
  if (/\b(hi|hello|hey|howdy|yo|help|what can you do|what do you do)\b/.test(m)) return "greeting";
  if (/(\bcategory\b|\bcategories\b|\btype\b|\bkind\b|\bsort\b|\bfilter\b)/.test(m)) return "categories";
  return "fallback";
};

// ML half of the hybrid chatbot (PDF §3.5: rule-based + ML-hybrid). The
// Python service classifies from a TF-IDF + LinearSVC model trained on the
// seed corpus plus every regex-confirmed query the app has seen; only if it
// has no answer does the LLM get asked.
const classifyIntentWithML = async (message) => {
  const result = await ai.classifyIntent(message);
  if (!result || !INTENTS.includes(result.intent)) return null;
  return result.intent;
};

// Last-resort intent guess when neither the regex cascade nor the ML
// classifier finds a match. The LLM only picks a label from the closed
// INTENTS list — it never generates the answer itself — so
// buildGroundedReply still produces the exact same deterministic,
// DB-backed reply for whatever intent comes back. Recent conversation
// history is included so follow-ups ("and its price?") resolve in context
// instead of falling through to "fallback".
const classifyIntentWithLLM = async (message, history) => {
  const systemPrompt =
    "You are an intent classifier for an event-management app's chatbot. " +
    `Reply with EXACTLY ONE of these labels and nothing else: ${INTENTS.join(", ")}. ` +
    "Pick 'greeting' for small talk or generic help requests, and 'fallback' only if truly nothing fits. " +
    "Use the conversation history to disambiguate follow-up questions (e.g. 'what about its price?' refers to the event just discussed).";
  const reply = await generateReply(systemPrompt, message, history);
  if (!reply) return null;
  const cleaned = reply.trim().toLowerCase().replace(/[^a-z_]/g, "");
  return INTENTS.includes(cleaned) ? cleaned : null;
};

// Absolute last resort when neither the regex cascade nor LLM intent
// classification finds a match: a grounded free-form answer, strictly
// limited to the real upcoming-event data injected below, so the model has
// no room to invent event names, dates, or prices.
const answerFreeform = async (req, message, history) => {
  const orgFilter = { organization: req.user.organization };
  const events = await Event.find(activeFilter(orgFilter, new Date()))
    .sort({ date: 1 })
    .limit(10)
    .lean();

  const context = events.length
    ? events
        .map(
          (e) =>
            `- "${e.title}" (${e.category}, ${e.type}) on ${new Date(e.date).toDateString()} at ${e.venue}, price: ${formatEventPrice(e.price)}, ${e.registered}/${e.capacity} registered — event page: /event/${e._id}`
        )
        .join("\n")
    : "No upcoming events right now.";

  const systemPrompt =
    "You are EventBot, a helpful assistant for an event-management app. " +
    "Answer the user's question in 1-3 short, friendly sentences using ONLY the event data below — " +
    "never invent event names, dates, prices, venues, or any fact not listed. " +
    "When you mention an event, include its markdown link exactly as shown (e.g. [Title](/event/ID)). " +
    "If the data doesn't contain the answer, say you're not sure and suggest what you can help with instead " +
    "(finding events, tickets, pricing, capacity, venues, schedules).\n\nUpcoming events:\n" +
    context;

  return generateReply(systemPrompt, message, history);
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

const shortDate = (d) =>
  new Date(d).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });

const distanceLabel = (km) =>
  km < 1 ? `${Math.round(km * 1000)}m` : `${km.toFixed(1)} km`;

// Events the user can still act on. Live events are kept even when their
// stored date has passed midnight (a festival seeded "today" is still very
// much happening) — a plain `date >= now` filter would silently drop them
// and produce wrong answers ("any free events?" omitting the live paid one).
const activeFilter = (orgFilter, now) => ({
  ...orgFilter,
  status: { $in: ["Upcoming", "Live"] },
  $or: [{ status: "Live" }, { date: { $gte: now } }],
});

// "free" / "paid" mention in the ask → filter the reply to that price
// class ("anything free nearby?" must not list paid events).
const pricePreference = (message) => {
  const m = message.toLowerCase();
  if (/\bfree\b|no cost|complimentary|freebies/.test(m)) return "free";
  if (/\bpaid\b|pay\b|\bcosts?\b|\bprice\b/.test(m)) return "paid";
  return null;
};

const buildGroundedReply = async (req, intent, eventId, message) => {
  const orgFilter = { organization: req.user.organization };
  const now = new Date();

  if (intent === "greeting") {
    return "Hi! I'm EventBot 👋 — I can recommend events for you, find free vs. paid events, check capacity, venues, schedules, your tickets, or what's trending. Tap a suggestion below or ask me anything!";
  }

  if (intent === "recommend") {
    const { hasLocation, recommendations } = await scoreEvents({
      attendee: req.user._id,
      organization: req.user.organization,
      location: req.user.location,
      limit: 5,
      withReasons: true,
    });
    if (!recommendations.length) {
      return "I don't have enough signal yet to recommend events 🎯 — register for an event or two and I'll learn your interests. Meanwhile, try: _What events are coming up?_";
    }
    let reply = "🎯 Here are my top picks for you:\n\n| # | Event | Why | When |";
    reply += "\n|---|-------|-----|------|";
    recommendations.forEach(({ event, distanceKm, reason }, i) => {
      reply += `\n| ${i + 1} | ${eventLink(event)} | ${reason}${distanceKm != null ? ` · ${distanceLabel(distanceKm)} away` : ""} | ${shortDate(event.date)} |`;
    });
    reply += `\n\n_Ranked from real registration data${hasLocation ? " and your location" : ""} — open any link to see details._`;
    return reply;
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

    let reply = `You have ${tickets.length} ticket${tickets.length === 1 ? "" : "s"}:\n\n| Event | Date | Status |`;
    reply += "\n|-------|------|--------|";
    tickets.forEach((t) => {
      const e = t.event;
      const statusEmoji = t.status === "checked-in" ? "✅ Checked in" : t.status === "cancelled" ? "❌ Cancelled" : "🎫 Valid";
      const dateStr = e ? shortDate(e.date) : "—";
      reply += `\n| ${e ? eventLink(e) : "Unknown event"} | ${dateStr} | ${statusEmoji} |`;
    });

    if (upcoming.length > 0) {
      reply += `\n\nYou have **${upcoming.length} upcoming** event${upcoming.length === 1 ? "" : "s"} to attend.`;
    }
    return reply;
  }

  if (intent === "near_me") {
    if (!hasValidCoords(req.user.location)) {
      return "I don't have your location yet 📍 — go to Settings to enable location sharing, then I can find events closest to you!";
    }
    const pref = pricePreference(message);
    const events = await Event.find(activeFilter(orgFilter, now)).populate("organizer", "name");

    const nearby = events
      .map((e) => ({
        title: e.title,
        venue: e.venue,
        km: haversineKm(req.user.location, e.coordinates),
        date: e.date,
        category: e.category,
        price: e.price?.amount ?? 0,
        id: e._id,
      }))
      .filter((e) => e.km != null)
      .filter((e) => (pref === "free" ? e.price === 0 : pref === "paid" ? e.price > 0 : true))
      .sort((a, b) => a.km - b.km)
      .slice(0, 5);

    if (!nearby.length) {
      const hint = pref === "free" ? "free " : pref === "paid" ? "paid " : "";
      return `I couldn't find any ${hint}events with location data near you. Try checking back later or browse all events on the Discover page.`;
    }

    const heading = pref === "free" ? "📍 Free events sorted by distance from you:" : "📍 Events sorted by distance from you:";
    let reply = `${heading}\n\n`;
    nearby.forEach((e) => {
      reply += `• **${e.title}** at ${e.venue} — ${distanceLabel(e.km)} (${e.category}) — [view](/event/${e.id})\n`;
    });
    const closest = nearby[0];
    reply += `\nThe closest is **${closest.title}** just ${distanceLabel(closest.km)} away!`;
    return reply;
  }

  if (intent === "upcoming_events") {
    const pref = pricePreference(message);
    const events = await Event.find(activeFilter(orgFilter, now))
      .sort({ date: 1 })
      .limit(8)
      .populate("organizer", "name")
      .lean();

    const filtered = pref === "free" ? events.filter((e) => !(e.price?.amount > 0)) : pref === "paid" ? events.filter((e) => e.price?.amount > 0) : events;

    if (!filtered.length) {
      const hint = pref === "free" ? "free " : pref === "paid" ? "paid " : "";
      return `No ${hint}upcoming events found for your organization right now. Check back soon for new events!`;
    }

    const noun = pref === "free" ? "free event" : pref === "paid" ? "paid event" : "event";
    const plural = filtered.length === 1 ? "is 1 " + noun : `are ${filtered.length} ${noun}s`;
    let reply = `📅 There ${plural} coming up:\n\n| Event | Date | Venue | Price | Fill |`;
    reply += "\n|-------|------|-------|-------|------|";
    filtered.forEach((e) => {
      const pct = Math.round((e.registered / e.capacity) * 100);
      reply += `\n| ${eventLink(e)} | ${shortDate(e.date)} | ${e.venue} | ${formatEventPrice(e.price)} | ${pct}% |`;
    });
    return reply;
  }

  if (intent === "event_count") {
    const [total, upcoming, past] = await Promise.all([
      Event.countDocuments(orgFilter),
      Event.countDocuments(activeFilter(orgFilter, now)),
      Event.countDocuments({ ...orgFilter, status: "Past" }),
    ]);
    const plural = (n, noun) => (n === 1 ? `is 1 ${noun}` : `are ${n} ${noun}s`);
    if (/(coming up|upcoming|this week|up next)/.test(message.toLowerCase())) {
      return `📅 There ${plural(upcoming, "event")} coming up — want me to list them?`;
    }
    return `📊 There ${plural(total, "event")} in total — ${upcoming} upcoming/live and ${past} past. Want me to list the upcoming ones?`;
  }

  if (intent === "popular_events") {
    const events = await Event.find(activeFilter(orgFilter, now))
      .sort({ registered: -1 })
      .limit(5);

    if (!events.length) {
      return "No events found at the moment.";
    }

    // The attendance model only exists once enough historical events have
    // been logged; without it, the velocity heuristic is noise, so hide the
    // column instead of printing made-up numbers.
    const canPredict = !!(await ai.health())?.attendance;

    let reply = "🔥 Most popular events right now:\n\n| Event | Registered |";
    reply += canPredict ? " Predicted | Fill |" : " Fill |";
    reply += canPredict ? "\n|-------|------------|-----------|------|" : "\n|-------|------------|------|";
    for (const e of events) {
      const pct = Math.round((e.registered / e.capacity) * 100);
      const row = `\n| ${eventLink(e)} | ${e.registered}/${e.capacity} |`;
      reply += canPredict
        ? `${row} ~${await predictAttendance(e)} | ${pct}% |`
        : `${row} ${pct}% |`;
    }
    return reply;
  }

  if (intent === "pricing") {
    const event = await resolveEvent(eventId, message, orgFilter);
    if (event) {
      const priceLabel = formatEventPrice(event.price);
      return event.price?.amount > 0
        ? `💰 **${event.title}** costs ${priceLabel} per ticket — [view event](/event/${event._id}). You can pay securely by card at checkout.`
        : `🎉 **${event.title}** is free — no payment needed, just register — [view event](/event/${event._id}).`;
    }

    const [free, paid] = await Promise.all([
      Event.find({ ...activeFilter(orgFilter, now), "price.amount": 0 })
        .sort({ date: 1 })
        .limit(6),
      Event.find({ ...activeFilter(orgFilter, now), "price.amount": { $gt: 0 } })
        .sort({ date: 1 })
        .limit(6),
    ]);

    const pref = pricePreference(message);
    // "any free events?" wants free ones; "what's paid?" wants paid ones. Only
    // a generic ask ("how much are tickets?") lists both sides.
    if (pref === "free") {
      if (!free.length) return "No free events right now.";
      return `🎉 **Free events:**\n\n${free.map((e) => `• ${eventLink(e)} — ${shortDate(e.date)}`).join("\n")}`;
    }
    if (pref === "paid") {
      if (!paid.length) return "No paid events right now — everything upcoming is free!";
      return `💰 **Paid events:**\n\n| Event | Price | Date |\n|-------|-------|------|\n${paid
        .map((e) => `| ${eventLink(e)} | ${formatEventPrice(e.price)} | ${shortDate(e.date)} |`)
        .join("\n")}`;
    }

    if (!free.length && !paid.length) {
      return "There are no upcoming events to price right now. Check back soon!";
    }

    let reply = "";
    if (free.length) {
      reply += `🎉 **Free events:**\n\n${free.map((e) => `• ${eventLink(e)} — ${shortDate(e.date)}`).join("\n")}`;
    } else {
      reply += "No free events right now.";
    }
    if (paid.length) {
      reply += `\n\n💰 **Paid events:**\n\n| Event | Price | Date |`;
      reply += "\n|-------|-------|------|";
      paid.forEach((e) => {
        reply += `\n| ${eventLink(e)} | ${formatEventPrice(e.price)} | ${shortDate(e.date)} |`;
      });
    }
    return reply;
  }

  if (intent === "organizer") {
    const event = await resolveEvent(eventId, message, orgFilter);
    if (!event) return NEED_EVENT_HINT;
    const organizerName = (typeof event.organizer === "object" && event.organizer?.name) || "the event organizer";
    return `**${event.title}** is organized by ${organizerName} — [view event](/event/${event._id}).`;
  }

  if (intent === "capacity") {
    const event = await resolveEvent(eventId, message, orgFilter);
    if (!event) return NEED_EVENT_HINT;
    const available = event.capacity - event.registered;
    const pct = Math.round((event.registered / event.capacity) * 100);
    const view = ` — [view event](/event/${event._id})`;
    if (available <= 0) {
      return `🚫 **${event.title}** is fully booked (${event.registered}/${event.capacity}). Check back in case a spot opens up from a cancellation.${view}`;
    }
    const canPredict = !!(await ai.health())?.attendance;
    const forecast = canPredict ? ` Based on current trends, we expect ${await predictAttendance(event)} total attendees.` : "";
    return `**${event.title}** has ${event.registered}/${event.capacity} registered (${pct}% full) — there ${available === 1 ? "is" : "are"} **${available}** spot${available === 1 ? "" : "s"} left.${forecast}${view}`;
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
    return `🏷️ Available event categories: ${categories.join(", ")}. You can filter by category on the Discover page, or ask me to _recommend_ events for you.`;
  }

  if (["venue", "schedule", "registration_status"].includes(intent)) {
    const event = await resolveEvent(eventId, message, orgFilter);
    if (!event) return NEED_EVENT_HINT;

    if (intent === "venue") {
      const hasCoords = hasValidCoords(event.coordinates);
      let reply = `📍 **${event.title}** is at ${event.venue}.`;
      if (hasCoords) {
        reply += ` Coordinates: ${event.coordinates.lat.toFixed(4)}, ${event.coordinates.lng.toFixed(4)}.`;
        if (hasValidCoords(req.user.location)) {
          const dist = haversineKm(req.user.location, event.coordinates);
          reply += ` It's ${distanceLabel(dist)} from your location.`;
        }
      }
      return `${reply} — [view event](/event/${event._id})`;
    }

    if (intent === "schedule") {
      const d = new Date(event.date);
      return `🗓️ **${event.title}** is scheduled for ${d.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })} at ${d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}. — [view event](/event/${event._id})`;
    }

    const ticket = await Ticket.findOne({ event: event._id, attendee: req.user._id });
    if (!ticket) {
      return `You are not registered for **${event.title}** yet — [view event](/event/${event._id}). Would you like to register?`;
    }
    const statusEmoji = ticket.status === "checked-in" ? "✅ Checked in" : ticket.status === "cancelled" ? "❌ Cancelled" : "🎫 Valid";
    return `You're registered for **${event.title}** (status: ${ticket.status}) ${statusEmoji}. Your ticket ID: ${ticket._id.toString().slice(-6).toUpperCase()}. — [view event](/event/${event._id})`;
  }

  return "I'm not sure how to help with that yet 🤔 Here's what I can do:\n\n• 🎯 **Recommend events** for you\n• 📍 Find events **near you**\n• 🎫 Show your **tickets**\n• 📅 List **upcoming** events\n• 💰 Check **free vs. paid** pricing\n• 👥 Check event **capacity**\n• 🔥 Find **popular/trending** events\n• 🗺️ Tell you about **venue and schedule**\n• ✅ Check your **registration status**\n\nWhat would you like to know?";
};

// Once an intent is known (whether from the regex cascade or the LLM
// classifier), the reply is always the grounded, DB-computed fact string
// returned verbatim — no LLM rephrasing step. That used to run every
// grounded reply through generateReply() (Groq/Gemini) to "sound more
// natural," but a small instant-tier model paraphrasing a multi-fact
// sentence (e.g. "these events are free, these are paid, these cost X")
// would routinely drop or garble facts, or shuffle a price onto the wrong
// event's name — same question, different (and sometimes wrong) answer on
// repeat asks. Grounded replies are already written as complete, friendly
// sentences with light emoji, so nothing is lost by returning them
// directly; what's gained is that every answer is exactly reproducible
// from the database. The LLM is only used (a) to classify genuinely
// unmatched phrasing into one of the same closed intents, (b) to explain
// each recommendation from the engine's own factors, and (c), as an
// absolute last resort, to answer free-form strictly from injected event
// data — never to rewrite an already-correct grounded fact.
const query = async (req, res) => {
  try {
    const { message, eventId, history } = req.body;
    if (!message) {
      return res.status(400).json({ message: "message is required" });
    }

    // Last ~8 turns give the LLM conversational context without bloating
    // the prompt (and its latency) with the whole transcript.
    const context = Array.isArray(history)
      ? history
          .filter((h) => h && typeof h.content === "string")
          .slice(-8)
          .map((h) => ({ role: h.role === "assistant" ? "assistant" : "user", content: h.content }))
      : [];

    let intent = matchIntent(message);
    const regexMatched = intent !== "fallback";
    if (intent === "fallback") {
      intent = (await classifyIntentWithML(message)) || "fallback";
    }
    if (intent === "fallback") {
      const llmIntent = await classifyIntentWithLLM(message, context);
      if (llmIntent) intent = llmIntent;
    }

    // Only regex-confirmed intents are ground-truth labels: feed them back to
    // the Python service so the ML classifier improves on every /train.
    if (regexMatched) ai.logIntent(message, intent);

    let reply = await buildGroundedReply(req, intent, eventId, message);

    if (intent === "fallback") {
      const freeform = await answerFreeform(req, message, context);
      if (freeform) reply = freeform;
    }

    res.json({ intent, reply });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Suggested prompt chips shown when the chat opens — dynamic where possible
// (nearby events only if location is on, tickets only if they exist,
// categories pulled from the DB), always falling back to static staples so
// the panel never opens empty.
const getSuggestions = async (req, res) => {
  try {
    const orgFilter = { organization: req.user.organization };
    const now = new Date();
    const [ticketCount, upcoming, categories] = await Promise.all([
      Ticket.countDocuments({ attendee: req.user._id }),
      Event.countDocuments(activeFilter(orgFilter, now)),
      Event.distinct("category", { ...orgFilter, status: { $in: ["Upcoming", "Live"] } }),
    ]);

    const suggestions = ["🎯 Recommend events for me"];
    if (ticketCount > 0) suggestions.push("🎫 Show my tickets");
    if (hasValidCoords(req.user.location)) suggestions.push("📍 What's near me?");
    if (upcoming > 0) suggestions.push("📅 What events are coming up?");
    suggestions.push("💰 Any free events?");
    if (upcoming > 0) suggestions.push("🔥 What's trending?");
    if (categories.length) suggestions.push(`🏷️ Categories: ${categories.slice(0, 3).join(", ")}`);
    suggestions.push("ℹ️ What can you do?");

    res.json({ suggestions: suggestions.slice(0, 8) });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { query, getSuggestions };