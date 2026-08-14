const Event = require("../models/Event");
const Ticket = require("../models/Ticket");

// "People you might want to meet" — real matchmaking over ticket history,
// not a fabricated list. Only surfaces a name and the shared interest
// categories that produced the match; never email or other contact info.
// Requires the caller to already be registered for the event (you can only
// network with people at events you're actually attending).
const getEventNetworking = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }

    const myTicket = await Ticket.findOne({
      event: event._id,
      attendee: req.user._id,
      status: { $ne: "cancelled" },
    });
    if (!myTicket) {
      return res.status(403).json({ message: "Register for this event to see networking suggestions" });
    }

    const myTickets = await Ticket.find({
      attendee: req.user._id,
      status: { $ne: "cancelled" },
    }).populate("event", "category");
    const myCategories = new Set(myTickets.filter((t) => t.event).map((t) => t.event.category));

    const otherTickets = await Ticket.find({
      event: event._id,
      attendee: { $ne: req.user._id },
      status: { $ne: "cancelled" },
    }).populate("attendee", "name");

    const attendeeIds = otherTickets.map((t) => t.attendee?._id).filter(Boolean);
    const theirTickets = await Ticket.find({
      attendee: { $in: attendeeIds },
      status: { $ne: "cancelled" },
    }).populate("event", "category");

    const categoriesByAttendee = {};
    theirTickets.forEach((t) => {
      if (!t.event) return;
      const id = t.attendee.toString();
      if (!categoriesByAttendee[id]) categoriesByAttendee[id] = new Set();
      categoriesByAttendee[id].add(t.event.category);
    });

    const suggestions = otherTickets
      .filter((t) => t.attendee)
      .map((t) => {
        const theirCategories = categoriesByAttendee[t.attendee._id.toString()] || new Set();
        const sharedInterests = [...theirCategories].filter((c) => myCategories.has(c));
        return {
          attendeeId: t.attendee._id,
          name: t.attendee.name,
          sharedInterests,
          matchScore: sharedInterests.length,
        };
      })
      .sort((a, b) => b.matchScore - a.matchScore)
      .slice(0, 20);

    res.json({ suggestions });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { getEventNetworking };
