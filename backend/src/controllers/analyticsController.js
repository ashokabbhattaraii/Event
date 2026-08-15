const Event = require("../models/Event");
const Ticket = require("../models/Ticket");
const { canManageEvent } = require("./eventController");
const predictAttendance = require("../utils/predictAttendance");

// Build event filter for the current user: events they created + events
// where their organization is a co-host.
const buildUserEventFilter = async (user) => {
  const baseFilter = user.role === "admin"
    ? { organization: user.organization }
    : { organizer: user._id };

  // If user is an org admin, also include events where their org is a co-host.
  if (user.role === "admin" && user.organization) {
    const coHostedEvents = await Event.find({ coHostOrganizations: user.organization })
      .select("_id")
      .lean();
    if (coHostedEvents.length > 0) {
      const coHostedIds = coHostedEvents.map((e) => e._id);
      return { $or: [baseFilter, { _id: { $in: coHostedIds } }] };
    }
  }
  return baseFilter;
};

const registrationsPerDay = async (eventFilter, days = 14) => {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const events = await Event.find(eventFilter).select("_id");
  const eventIds = events.map((e) => e._id);

  const rows = await Ticket.aggregate([
    { $match: { event: { $in: eventIds }, createdAt: { $gte: since } } },
    {
      $group: {
        _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
        count: { $sum: 1 },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  return rows.map((r) => ({ date: r._id, registrations: r.count }));
};

const categoryBreakdown = async (eventFilter) => {
  const rows = await Event.aggregate([
    { $match: eventFilter },
    { $group: { _id: "$category", count: { $sum: 1 }, registered: { $sum: "$registered" } } },
    { $sort: { count: -1 } },
  ]);
  return rows.map((r) => ({ category: r._id, events: r.count, registered: r.registered }));
};

// Organizer: scoped to events they personally created + co-hosted.
const getOrganizerAnalytics = async (req, res) => {
  try {
    const filter = await buildUserEventFilter(req.user);
    const events = await Event.find(filter).sort({ date: 1 });

    const trend = await registrationsPerDay(filter);
    const categories = await categoryBreakdown(filter);

    const eventStats = await Promise.all(
      events.map(async (event) => ({
        _id: event._id,
        title: event.title,
        date: event.date,
        capacity: event.capacity,
        registered: event.registered,
        fillRate: event.capacity > 0 ? Math.round((event.registered / event.capacity) * 100) : 0,
        predictedAttendance: await predictAttendance(event),
      }))
    );

    res.json({ trend, categories, events: eventStats });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Admin: scoped to the caller's own organization + co-hosted events.
const getAdminAnalytics = async (req, res) => {
  try {
    const filter = await buildUserEventFilter(req.user);
    const events = await Event.find(filter);
    const eventIds = events.map((e) => e._id);

    const [totalTickets, checkedIn, trend, categories] = await Promise.all([
      Ticket.countDocuments({ event: { $in: eventIds } }),
      Ticket.countDocuments({ event: { $in: eventIds }, status: "checked-in" }),
      registrationsPerDay(filter),
      categoryBreakdown(filter),
    ]);

    res.json({
      totalEvents: events.length,
      totalTickets,
      checkedIn,
      checkInRate: totalTickets > 0 ? Math.round((checkedIn / totalTickets) * 100) : 0,
      trend,
      categories,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Segments the caller's attendee base by interest category (drawn from real
// ticket history, not survey data), engagement tier (first-timer vs.
// returning), and check-in rate — genuine aggregation over existing
// Event/Ticket data rather than a trained clustering model.
const getAudienceSegments = async (req, res) => {
  try {
    const filter = await buildUserEventFilter(req.user);

    const events = await Event.find(filter).select("_id category");
    const eventIds = events.map((e) => e._id);
    const categoryByEvent = Object.fromEntries(
      events.map((e) => [e._id.toString(), e.category])
    );

    const tickets = await Ticket.find({
      event: { $in: eventIds },
      status: { $ne: "cancelled" },
    }).select("event attendee status");

    const byCategory = {};
    const ticketCountByAttendee = {};
    let checkedIn = 0;

    tickets.forEach((t) => {
      const cat = categoryByEvent[t.event.toString()] || "Other";
      byCategory[cat] = (byCategory[cat] || 0) + 1;
      const aid = t.attendee.toString();
      ticketCountByAttendee[aid] = (ticketCountByAttendee[aid] || 0) + 1;
      if (t.status === "checked-in") checkedIn += 1;
    });

    const attendeeIds = Object.keys(ticketCountByAttendee);
    const newAttendees = attendeeIds.filter((id) => ticketCountByAttendee[id] === 1).length;
    const returningAttendees = attendeeIds.filter((id) => ticketCountByAttendee[id] > 1).length;

    res.json({
      totalAttendees: attendeeIds.length,
      byInterestCategory: Object.entries(byCategory)
        .map(([category, count]) => ({ category, count }))
        .sort((a, b) => b.count - a.count),
      byEngagement: [
        { tier: "New (1 event)", count: newAttendees },
        { tier: "Returning (2+ events)", count: returningAttendees },
      ],
      checkInRate: tickets.length > 0 ? Math.round((checkedIn / tickets.length) * 100) : 0,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Suggests a send-time window from when past registrations actually
// happened (real timestamp aggregation), plus which category is converting
// best — feeds the organizer's notification/marketing workflow.
const getMarketingInsight = async (req, res) => {
  try {
    const filter = await buildUserEventFilter(req.user);

    const events = await Event.find(filter).select("_id category registered capacity");
    const eventIds = events.map((e) => e._id);
    const tickets = await Ticket.find({ event: { $in: eventIds } }).select("createdAt");

    const hourCounts = new Array(24).fill(0);
    const dayCounts = new Array(7).fill(0);
    tickets.forEach((t) => {
      const d = new Date(t.createdAt);
      hourCounts[d.getHours()] += 1;
      dayCounts[d.getDay()] += 1;
    });

    const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const bestHour = hourCounts.indexOf(Math.max(...hourCounts));
    const bestDayIdx = dayCounts.indexOf(Math.max(...dayCounts));

    const bestCategory = events
      .filter((e) => e.capacity > 0)
      .map((e) => ({ category: e.category, fillRate: e.registered / e.capacity }))
      .sort((a, b) => b.fillRate - a.fillRate)[0];

    const hasEnoughData = tickets.length >= 5;

    res.json({
      hasEnoughData,
      suggestedSendWindow: hasEnoughData
        ? `${dayNames[bestDayIdx]}s around ${bestHour % 12 || 12}${bestHour < 12 ? "am" : "pm"}`
        : null,
      topPerformingCategory: bestCategory?.category || null,
      note: hasEnoughData
        ? "Based on when your past registrations actually happened — send reminders and promotions in this window for the highest response rate."
        : "Not enough registration history yet to recommend a send window. Suggestions appear once your events collect more registrations.",
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getOrganizerAnalytics,
  getAdminAnalytics,
  getAudienceSegments,
  getMarketingInsight,
};
