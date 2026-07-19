const mongoose = require("mongoose");
const Ticket = require("../models/Ticket");
const Event = require("../models/Event");
const { signTicketToken, verifyTicketToken } = require("../utils/qrToken");
const { createNotification } = require("./notificationController");

const registerForEvent = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }
    if (event.registered >= event.capacity) {
      return res.status(400).json({ message: "Event is at full capacity" });
    }

    const existing = await Ticket.findOne({
      event: event._id,
      attendee: req.user._id,
    });
    if (existing) {
      return res.status(400).json({ message: "Already registered for this event" });
    }

    const ticketId = new mongoose.Types.ObjectId();
    const qrToken = signTicketToken(
      ticketId.toString(),
      event._id.toString(),
      req.user._id.toString()
    );

    const ticket = await Ticket.create({
      _id: ticketId,
      event: event._id,
      attendee: req.user._id,
      organization: event.organization,
      qrToken,
    });

    event.registered += 1;
    await event.save();

    await createNotification({
      recipient: req.user._id,
      organization: event.organization,
      type: "registration",
      title: "Registration confirmed",
      message: `You're registered for ${event.title}. Your QR ticket is ready.`,
      event: event._id,
    });
    await createNotification({
      recipient: event.organizer,
      organization: event.organization,
      type: "registration",
      title: "New registration",
      message: `${req.user.name} registered for ${event.title}.`,
      event: event._id,
    });

    res.status(201).json({ ticket });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getMyTickets = async (req, res) => {
  try {
    const tickets = await Ticket.find({ attendee: req.user._id })
      .populate("event")
      .sort({ createdAt: -1 });
    res.json({ tickets });
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

module.exports = { registerForEvent, getMyTickets, verifyTicket };
