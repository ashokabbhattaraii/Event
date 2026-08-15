// Shared recommendation engine. Single source of truth for "what should this
// attendee see next" — used by the /api/recommendations endpoint AND the
// chatbot's "recommend" intent, so both surfaces rank identically.
//
// Two-tier strategy (PDF §3.5: collaborative filtering recommender):
//   1. Python AI service (ai-service/) ranks via collaborative filtering
//      trained on the attendee x event interaction matrix — when the user
//      has history and the service is up.
//   2. Deterministic weighted heuristics over real DB facts as fallback
//      (cold start / service down / no model). Never an LLM in the math.
// The LLM is used only AFTER ranking to phrase a friendly one-line "why"
// per pick, strictly grounded in the factor list computed here — via
// ai.generate() (ai-service's Groq/Gemini call, with a direct-from-Node
// fallback if that service is down); if no LLM answer comes back at all it
// falls back to a deterministic sentence from the same factors.

const Event = require("../models/Event");
const Ticket = require("../models/Ticket");
const { haversineKm, hasValidCoords } = require("./geo");
const predictAttendance = require("./predictAttendance");
const ai = require("./aiClient");

const proximityScore = (distanceKm) => {
  if (distanceKm == null) return 0;
  if (distanceKm <= 1) return 20;
  if (distanceKm <= 3) return 17;
  if (distanceKm <= 5) return 14;
  if (distanceKm <= 10) return 10;
  if (distanceKm <= 25) return 6;
  if (distanceKm <= 50) return 3;
  if (distanceKm >= 60) return 0;
  return Math.round((20 * (1 - (distanceKm - 1) / 59)) * 10) / 10;
};

// Compact human-readable factor list per candidate; feeds both the
// deterministic fallback reason and the LLM explainer (which must not
// invent anything beyond these).
const describeFactors = ({ fillRate, velocityScore, proximity, recencyScore, categoryMatched, typeMatched, comboMatched }) => {
  const factors = [];
  if (categoryMatched) factors.push("matches your interests");
  if (typeMatched) factors.push(`prefers ${typeMatched} events`);
  if (comboMatched) factors.push("same category + format as events you attended");
  if (recencyScore > 0) factors.push("recent interest in this category");
  if (fillRate >= 0.5) factors.push(`${Math.round(fillRate * 100)}% full & trending`);
  if (velocityScore >= 5) factors.push("filling fast");
  if (proximity >= 10) factors.push(`${proximity >= 20 ? "very close" : "nearby"} to you`);
  return factors;
};

const fallbackReason = (s) => {
  const factors = s.factors.length ? s.factors.slice(0, 2).join("; ") : "great fit for your profile";
  return `Top pick — ${factors}.`;
};

// Batched one-liner reasons for every ranked event, grounded only in the
// engine's own numbers/factors. One LLM call total; null/partial output
// degrades to deterministic reasons.
const addAiReasons = async (scored) => {
  if (!scored.length) return;

  const promptLines = scored.map(
    (s, i) =>
      `${i + 1}. "${s.event.title}" | ${s.event.category} | ${s.event.registered}/${s.event.capacity} registered | ${s.factors.length ? s.factors.join(", ") : "general fit"}`
  );
  const systemPrompt =
    "You are EventNexus AI. For each numbered event write EXACTLY ONE short, friendly sentence (max 15 words) " +
    "explaining why it's recommended, using ONLY the facts and factors listed. " +
    "Never invent data. Reply with one line per event, numbered like the input, nothing else.";
  const reply = await ai.generate(systemPrompt, promptLines.join("\n"));

  const parsed = {};
  if (reply) {
    for (const line of reply.split("\n")) {
      const m = /^(\d+)[.)]\s*(.+)$/.exec(line.trim());
      if (m) parsed[parseInt(m[1], 10)] = m[2].trim();
    }
  }

  scored.forEach((s, i) => {
    s.reason = parsed[i + 1] || fallbackReason(s);
  });
};

// Deterministic scorer: weights over real DB facts, same as before the AI
// service existed. Returns the ranked top-N with per-event metadata.
const scoreDeterministic = async ({
  candidates,
  myTickets,
  location,
  limit,
  interestWeights,
  categoryWeights,
  typeWeights,
  categoryLastSeen,
  registeredEventIds,
}) => {
  const hasUserLoc = hasValidCoords(location);

  const scored = candidates
    .filter((event) => !registeredEventIds.has(event._id.toString()))
    .map((event) => {
      const catScore = (categoryWeights[event.category] || 0) * 8;
      const typeScore = (typeWeights[event.type] || 0) * 4;
      const comboKey = `${event.category}|${event.type}`;
      const comboScore = (interestWeights[comboKey] || 0) * 6;

      const daysSinceCreated = Math.max(1, (Date.now() - new Date(event.createdAt).getTime()) / (1000 * 60 * 60 * 24));
      const registrationVelocity = event.registered / daysSinceCreated;
      const velocityScore = Math.min(registrationVelocity * 3, 10);

      const predicted = predictAttendance.heuristic(event);
      const demandPressure = event.capacity > 0
        ? ((predicted - event.registered) / event.capacity) * 5
        : 0;

      const fillRate = event.capacity > 0 ? event.registered / event.capacity : 0;
      const popularityScore = fillRate * 7;

      const distanceKm =
        hasUserLoc && hasValidCoords(event.coordinates)
          ? Math.round(haversineKm(location, event.coordinates) * 10) / 10
          : null;
      const proximity = proximityScore(distanceKm);

      let recencyScore = 0;
      const lastSeen = categoryLastSeen[event.category];
      if (lastSeen) {
        const daysSince = Math.max(0, (Date.now() - lastSeen.getTime()) / (1000 * 60 * 60 * 24));
        recencyScore = Math.max(0, 5 - (daysSince / 150) * 5);
      }

      const score = Math.round(
        (catScore + typeScore + comboScore + velocityScore + demandPressure + popularityScore + proximity + recencyScore) * 10
      ) / 10;

      return {
        event,
        score,
        distanceKm,
        predicted,
        factors: describeFactors({
          fillRate,
          velocityScore,
          proximity,
          recencyScore,
          categoryMatched: catScore >= 8,
          typeMatched: typeScore >= 4 ? event.type : null,
          comboMatched: comboScore >= 6,
        }),
      };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  return { scored, hasLocation: hasUserLoc };
};

// CF-first path: Python service ranked by collaborative filtering. We rehydrate
// the event documents, attach deterministic context (distance, predicted) and
// factor strings so the reason layer works identically.
const buildFromCf = async ({ candidates, cf, location, limit }) => {
  const hasUserLoc = hasValidCoords(location);
  const byId = new Map(candidates.map((e) => [e._id.toString(), e]));
  const entries = [];
  for (const r of cf.recommendations) {
    const event = byId.get(String(r.event_id));
    if (!event || event.registered >= event.capacity) continue;
    entries.push({ event, cfScore: r.score });
    if (entries.length >= limit) break;
  }
  if (!entries.length) return null;

  const predictions = await predictAttendance.batch(entries.map((e) => e.event));

  return {
    scored: entries.map(({ event, cfScore }, i) => {
      const fillRate = event.capacity > 0 ? event.registered / event.capacity : 0;
      const daysSinceCreated = Math.max(1, (Date.now() - new Date(event.createdAt).getTime()) / (1000 * 60 * 60 * 24));
      const velocityScore = Math.min((event.registered / daysSinceCreated) * 3, 10);
      const distanceKm =
        hasUserLoc && hasValidCoords(event.coordinates)
          ? Math.round(haversineKm(location, event.coordinates) * 10) / 10
          : null;
      const proximity = proximityScore(distanceKm);
      return {
        event,
        score: Math.round(cfScore * 1000) / 10,
        distanceKm,
        predicted: predictions[i],
        factors: describeFactors({ fillRate, velocityScore, proximity, recencyScore: 0 }),
      };
    }),
    hasLocation: hasUserLoc,
  };
};

const scoreEvents = async ({ attendee, organization, location, limit = 12, withReasons = false }) => {
  const [myTickets, candidates] = await Promise.all([
    Ticket.find({ attendee }).populate("event").sort({ createdAt: -1 }),
    // Not scoped to `organization` — the public Discover page shows every
    // non-draft event across every organization, and recommendations should
    // draw from that same cross-org pool, not just events owned by whatever
    // org (if any) the attendee happens to be attached to.
    // Live events are kept even when their stored date has passed midnight —
    // a `date >= now`-only filter would silently drop today's live events.
    Event.find({
      status: { $in: ["Upcoming", "Live"] },
      $or: [{ status: "Live" }, { date: { $gte: new Date() } }],
    }).populate("organizer", "name"),
  ]);

  const registeredEventIds = new Set(
    myTickets.filter((t) => t.event).map((t) => t.event._id.toString())
  );

  // Tier 1: collaborative filtering from the Python AI service.
  const cf = await ai.recommend(attendee, organization);
  if (cf?.has_cf && cf.recommendations.length) {
    const fromCf = await buildFromCf({ candidates, cf, location, limit });
    if (fromCf) {
      if (withReasons) await addAiReasons(fromCf.scored);
      return { ...fromCf, recommendations: fromCf.scored };
    }
  }

  // Tier 2: deterministic heuristics (cold start / service down / no model).
  const interestWeights = {};
  const categoryWeights = {};
  const typeWeights = {};
  const categoryLastSeen = {};

  myTickets.forEach((t) => {
    if (!t.event) return;
    const cat = t.event.category;
    const typ = t.event.type;
    const key = `${cat}|${typ}`;
    interestWeights[key] = (interestWeights[key] || 0) + 1;
    categoryWeights[cat] = (categoryWeights[cat] || 0) + 1;
    typeWeights[typ] = (typeWeights[typ] || 0) + 1;

    const eventDate = new Date(t.event.date);
    if (eventDate < new Date() && (!categoryLastSeen[cat] || eventDate > categoryLastSeen[cat])) {
      categoryLastSeen[cat] = eventDate;
    }
  });

  const { scored, hasLocation } = await scoreDeterministic({
    candidates,
    myTickets,
    location,
    limit,
    interestWeights,
    categoryWeights,
    typeWeights,
    categoryLastSeen,
    registeredEventIds,
  });

  // Replace heuristic forecasts with the trained model's when available.
  const predictions = await predictAttendance.batch(scored.map((s) => s.event));
  scored.forEach((s, i) => (s.predicted = predictions[i]));

  if (withReasons) await addAiReasons(scored);

  return { scored, hasLocation, recommendations: scored };
};

module.exports = { scoreEvents, proximityScore };