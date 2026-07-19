const Event = require("../models/Event");
const Ticket = require("../models/Ticket");

// Content-based scoring: rank upcoming events the attendee hasn't registered for
// by how much they overlap with categories/types the attendee has shown interest
// in before, plus a small popularity signal (fill rate) as a tie-breaker. This is
// a deliberately simple stand-in for the report's collaborative-filtering model —
// swap in a real ML pipeline later without changing the endpoint contract.
const getRecommendations = async (req, res) => {
  try {
    const myTickets = await Ticket.find({ attendee: req.user._id }).populate("event");
    const registeredEventIds = new Set(
      myTickets.filter((t) => t.event).map((t) => t.event._id.toString())
    );

    const interestWeights = {};
    myTickets.forEach((t) => {
      if (!t.event) return;
      const key = `${t.event.category}|${t.event.type}`;
      interestWeights[key] = (interestWeights[key] || 0) + 1;
    });
    const categoryWeights = {};
    myTickets.forEach((t) => {
      if (!t.event) return;
      categoryWeights[t.event.category] = (categoryWeights[t.event.category] || 0) + 1;
    });

    const candidates = await Event.find({
      status: { $in: ["Upcoming", "Live"] },
      date: { $gte: new Date() },
    }).populate("organizer", "name");

    const scored = candidates
      .filter((event) => !registeredEventIds.has(event._id.toString()))
      .map((event) => {
        const categoryScore = (categoryWeights[event.category] || 0) * 10;
        const fillRate = event.capacity > 0 ? event.registered / event.capacity : 0;
        const popularityScore = fillRate * 5;
        const score = categoryScore + popularityScore;
        return { event, score: Math.round(score * 10) / 10 };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 10);

    res.json({
      recommendations: scored.map(({ event, score }) => ({ event, score })),
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { getRecommendations };
