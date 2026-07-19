const Event = require("../models/Event");
const Ticket = require("../models/Ticket");
const predictAttendance = require("../utils/predictAttendance");

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

// Organizer: scoped to events they personally created.
const getOrganizerAnalytics = async (req, res) => {
  try {
    const filter = { organizer: req.user._id };
    const events = await Event.find(filter).sort({ date: 1 });

    const trend = await registrationsPerDay(filter);
    const categories = await categoryBreakdown(filter);

    const eventStats = events.map((event) => ({
      _id: event._id,
      title: event.title,
      date: event.date,
      capacity: event.capacity,
      registered: event.registered,
      fillRate: event.capacity > 0 ? Math.round((event.registered / event.capacity) * 100) : 0,
      predictedAttendance: predictAttendance(event),
    }));

    res.json({ trend, categories, events: eventStats });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Admin: scoped to the caller's own organization (never cross-tenant).
const getAdminAnalytics = async (req, res) => {
  try {
    const filter = { organization: req.user.organization };
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

module.exports = { getOrganizerAnalytics, getAdminAnalytics };
