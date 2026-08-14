const Event = require("../models/Event");
const Ticket = require("../models/Ticket");
const { haversineKm, hasValidCoords } = require("../utils/geo");
const predictAttendance = require("../utils/predictAttendance");

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

const getRecommendations = async (req, res) => {
  try {
    const myTickets = await Ticket.find({ attendee: req.user._id })
      .populate("event")
      .sort({ createdAt: -1 });

    const registeredEventIds = new Set(
      myTickets.filter((t) => t.event).map((t) => t.event._id.toString())
    );

    const interestWeights = {};
    const categoryWeights = {};
    const typeWeights = {};
    // Most recent past-event date per category — powers the recency boost
    // below, so a category you attended last week outranks one from a year
    // ago even if both have the same raw interest weight.
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

    const candidates = await Event.find({
      organization: req.user.organization,
      status: { $in: ["Upcoming", "Live"] },
      date: { $gte: new Date() },
    }).populate("organizer", "name");

    const userLoc = req.user.location;
    const hasUserLoc = hasValidCoords(userLoc);

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

        const predicted = predictAttendance(event);
        const demandPressure = event.capacity > 0
          ? ((predicted - event.registered) / event.capacity) * 5
          : 0;

        const fillRate = event.capacity > 0 ? event.registered / event.capacity : 0;
        const popularityScore = fillRate * 7;

        const distanceKm =
          hasUserLoc && hasValidCoords(event.coordinates)
            ? Math.round(haversineKm(userLoc, event.coordinates) * 10) / 10
            : null;
        const proximity = proximityScore(distanceKm);

        // Decaying boost for categories attended recently: full +5 right
        // after attending, fading to 0 over ~5 months.
        let recencyScore = 0;
        const lastSeen = categoryLastSeen[event.category];
        if (lastSeen) {
          const daysSince = Math.max(0, (Date.now() - lastSeen.getTime()) / (1000 * 60 * 60 * 24));
          recencyScore = Math.max(0, 5 - (daysSince / 150) * 5);
        }

        const score = Math.round(
          (catScore + typeScore + comboScore + velocityScore + demandPressure + popularityScore + proximity + recencyScore) * 10
        ) / 10;

        return { event, score, distanceKm, proximity, predicted };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 12);

    res.json({
      hasLocation: hasUserLoc,
      recommendations: scored.map(({ event, score, distanceKm, predicted }) => ({
        event: {
          ...event.toObject(),
          predictedAttendance: predicted,
        },
        score,
        distanceKm,
      })),
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { getRecommendations };
