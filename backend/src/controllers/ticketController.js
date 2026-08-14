const Event = require("../models/Event");
const Ticket = require("../models/Ticket");
const { verifyTicketToken } = require("../utils/qrToken");
const { createNotification } = require("./notificationController");
const { claimAndIssueTicket } = require("../utils/ticketing");
const {
  parsePagination,
  buildFilters,
  parseSort,
  paginate,
} = require("../utils/query");

const registerForEvent = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }

    if (event.price?.amount > 0) {
      return res.status(400).json({
        message: "This event requires payment — use the checkout endpoint instead",
        requiresPayment: true,
      });
    }

    const existing = await Ticket.findOne({
      event: event._id,
      attendee: req.user._id,
      status: { $ne: "cancelled" },
    });
    if (existing) {
      return res.status(400).json({ message: "Already registered for this event" });
    }

    const ticket = await claimAndIssueTicket({
      event,
      attendeeId: req.user._id,
      attendeeName: req.user.name,
      payment: { status: "none", amount: 0, currency: event.price?.currency || "NPR" },
    });

    res.status(201).json({ ticket });
  } catch (error) {
    res.status(error.status || 500).json({ message: error.message });
  }
};

const getMyTickets = async (req, res) => {
  try {
    const { page, limit, skip } = parsePagination(req.query, { defaultLimit: 12 });
    const filter = {
      attendee: req.user._id,
      ...buildFilters(req.query, ["status"]),
    };
    const sort = parseSort(req.query.sort, ["createdAt"], { createdAt: -1 });

    const { data, pagination } = await paginate(Ticket, {
      filter,
      page,
      limit,
      skip,
      sort,
      populate: "event",
    });
    res.json({ tickets: data, pagination });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Attendee self-service cancellation: only their own ticket, only before the
// event starts, and only if it hasn't already been checked in.
const cancelTicket = async (req, res) => {
  try {
    const ticket = await Ticket.findOne({
      _id: req.params.id,
      attendee: req.user._id,
    }).populate("event");

    if (!ticket) {
      return res.status(404).json({ message: "Ticket not found" });
    }
    if (ticket.status === "cancelled") {
      return res.status(400).json({ message: "Ticket is already cancelled" });
    }
    if (ticket.status === "checked-in") {
      return res.status(400).json({ message: "Cannot cancel a ticket that's already checked in" });
    }
    if (ticket.event && new Date(ticket.event.date) <= new Date()) {
      return res.status(400).json({ message: "Cannot cancel — this event has already started" });
    }

    ticket.status = "cancelled";
    ticket.cancelledAt = new Date();
    await ticket.save();

    if (ticket.event) {
      await Event.updateOne(
        { _id: ticket.event._id, registered: { $gt: 0 } },
        { $inc: { registered: -1 } }
      );

      await createNotification({
        recipient: ticket.event.organizer,
        organization: ticket.organization,
        type: "registration",
        title: "Registration cancelled",
        message: `${req.user.name} cancelled their registration for ${ticket.event.title}.`,
        event: ticket.event._id,
      });
    }

    res.json({ ticket });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Organizer/admin-only: validates the signed QR payload, confirms the ticket's
// event belongs to the caller's own organization, then marks it checked-in.
// This is what prevents forged tickets and cross-org check-ins.
const verifyTicket = async (req, res) => {
  try {
    const { qrToken } = req.body;
    const payload = verifyTicketToken(qrToken);
    if (!payload) {
      return res.status(400).json({ message: "Invalid or forged ticket" });
    }

    const ticket = await Ticket.findById(payload.ticketId).populate("event");
    if (!ticket || ticket.qrToken !== qrToken) {
      return res.status(404).json({ message: "Ticket not found" });
    }

    if (ticket.organization.toString() !== req.user.organization.toString()) {
      return res.status(403).json({ message: "Ticket belongs to a different organization" });
    }

    if (ticket.status === "checked-in") {
      return res.status(400).json({ message: "Ticket already checked in" });
    }
    if (ticket.status === "cancelled") {
      return res.status(400).json({ message: "Ticket has been cancelled" });
    }

    ticket.status = "checked-in";
    ticket.checkedInAt = new Date();
    ticket.checkedInBy = req.user._id;
    await ticket.save();

    res.json({ ticket });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { registerForEvent, getMyTickets, cancelTicket, verifyTicket };
