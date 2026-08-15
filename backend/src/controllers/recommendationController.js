// Thin controller: the scoring math lives in utils/recommendationEngine.js
// (shared with the chatbot's "recommend" intent, so both surfaces rank
// identically). Scored deterministically from real DB data; the engine
// then asks the LLM (Gemini → Groq) for a one-line, data-grounded "why"
// per pick, with a deterministic fallback when the LLM is unavailable.
const { scoreEvents } = require("../utils/recommendationEngine");

const getRecommendations = async (req, res) => {
  try {
    const { hasLocation, recommendations } = await scoreEvents({
      attendee: req.user._id,
      organization: req.user.organization,
      location: req.user.location,
      limit: 12,
      withReasons: true,
    });

    res.json({
      hasLocation,
      recommendations: recommendations.map(({ event, score, distanceKm, predicted, reason }) => ({
        event: {
          ...event.toObject(),
          predictedAttendance: predicted,
        },
        score,
        distanceKm,
        reason,
      })),
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { getRecommendations };