// Attendance forecast. AI-first: the Python service's trained regressor
// (trained on historical registration/attendance data) is asked first; the
// deterministic velocity heuristic below remains the fallback whenever the
// AI service is unreachable or has no model yet.
const ai = require("./aiClient");

const heuristic = (event) => {
  const now = Date.now();
  const createdAt = new Date(event.createdAt).getTime();
  const eventDate = new Date(event.date).getTime();

  const daysSinceCreated = Math.max(1, (now - createdAt) / (1000 * 60 * 60 * 24));
  const daysUntilEvent = Math.max(0, (eventDate - now) / (1000 * 60 * 60 * 24));

  if (event.registered === 0 || eventDate <= now) {
    return event.registered;
  }

  const velocityPerDay = event.registered / daysSinceCreated;
  const projected = event.registered + velocityPerDay * daysUntilEvent;

  return Math.min(event.capacity, Math.round(projected));
};

const predictAttendance = async (event) => {
  const predictions = await ai.predictAttendance([event]);
  if (predictions && predictions.length && predictions[0].predicted != null) {
    return predictions[0].predicted;
  }
  return heuristic(event);
};

// Batch variant for when many events need forecasting at once.
const predictAttendanceBatch = async (events) => {
  const predictions = await ai.predictAttendance(events);
  if (!predictions || predictions.length !== events.length) {
    return events.map(heuristic);
  }
  const byId = new Map(predictions.map((p) => [String(p.event_id), p.predicted]));
  return events.map((e) => byId.get(String(e._id)) ?? heuristic(e));
};

module.exports = predictAttendance;
module.exports.batch = predictAttendanceBatch;
module.exports.heuristic = heuristic;
