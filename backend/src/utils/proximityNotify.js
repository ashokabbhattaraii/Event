const User = require("../models/User");
const Notification = require("../models/Notification");

// How far "near you" reaches, in km. Configurable per deployment since it's
// as much a product decision (dense city vs. rural region) as a technical one.
const RADIUS_KM = Number(process.env.NEARBY_EVENT_RADIUS_KM) || 25;
// Safety cap — a very central venue in a dense org shouldn't fan out to
// thousands of notification writes on a single event publish.
const MAX_NOTIFIED = 300;

// Fires when an event goes live (created non-draft, or transitions out of
// Draft): finds attendees/organizers in the same organization within
// RADIUS_KM of the venue (using the 2dsphere index on location.geo, a real
// geospatial query rather than pulling every user and computing haversine
// in application code) and drops a "new event near you" notification for
// each. Deliberately fire-and-forget from the caller — a slow or failed
// notification fan-out should never block event creation/publishing.
const notifyNearbyUsers = async (event) => {
  if (!event.coordinates?.geo?.coordinates) {
    return { notified: 0, reason: "event has no coordinates" };
  }

  const nearby = await User.find({
    organization: event.organization,
    _id: { $ne: event.organizer },
    role: { $in: ["attendee", "organizer"] },
    "location.geo": {
      $near: {
        $geometry: event.coordinates.geo,
        $maxDistance: RADIUS_KM * 1000,
      },
    },
  })
    .select("_id")
    .limit(MAX_NOTIFIED)
    .lean();

  if (!nearby.length) return { notified: 0 };

  const docs = nearby.map((user) => ({
    recipient: user._id,
    organization: event.organization,
    type: "nearby-event",
    title: "New event near you",
    message: `"${event.title}" was just published at ${event.venue}, within ${RADIUS_KM} km of you.`,
    event: event._id,
  }));

  await Notification.insertMany(docs, { ordered: false });
  return { notified: docs.length };
};

module.exports = { notifyNearbyUsers, RADIUS_KM };
