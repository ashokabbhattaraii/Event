// Lightweight heuristic, not a trained model: projects final turnout from the
// registration velocity observed so far (registrations per day since the event
// was created), extrapolated out to the event date and capped at capacity.
const predictAttendance = (event) => {
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

module.exports = predictAttendance;
