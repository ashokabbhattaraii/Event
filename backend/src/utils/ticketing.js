const mongoose = require("mongoose");
const Event = require("../models/Event");
const Ticket = require("../models/Ticket");
const { signTicketToken } = require("./qrToken");
const { createNotification } = require("../controllers/notificationController");

// Atomically reserves one capacity slot then issues the ticket. The capacity
// check-and-increment happens as a single findOneAndUpdate so two concurrent
// registrations can never both slip through when only one slot is left (the
// bug in the original registerForEvent, which checked then incremented as
// two separate steps). If ticket creation fails after the slot is claimed
// (e.g. the unique event+attendee index rejects a duplicate), the slot is
// released again.
const claimAndIssueTicket = async ({ event, attendeeId, attendeeName, payment }) => {
  const claimed = await Event.findOneAndUpdate(
    { _id: event._id, $expr: { $lt: ["$registered", "$capacity"] } },
    { $inc: { registered: 1 } },
    { new: true }
  );
  if (!claimed) {
    const err = new Error("Event is at full capacity");
    err.status = 400;
    throw err;
  }

  const ticketId = new mongoose.Types.ObjectId();
  const qrToken = signTicketToken(
    ticketId.toString(),
    event._id.toString(),
    attendeeId.toString()
  );

  let ticket;
  try {
    ticket = await Ticket.create({
      _id: ticketId,
      event: event._id,
      attendee: attendeeId,
      organization: event.organization,
      qrToken,
      payment: payment || { status: "none" },
    });
  } catch (error) {
    await Event.updateOne({ _id: event._id }, { $inc: { registered: -1 } });
    throw error;
  }

  await createNotification({
    recipient: attendeeId,
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
    message: `${attendeeName} registered for ${event.title}.`,
    event: event._id,
  });

  return ticket;
};

module.exports = { claimAndIssueTicket };
