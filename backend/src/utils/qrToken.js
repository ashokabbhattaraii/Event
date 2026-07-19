const jwt = require("jsonwebtoken");

const QR_SECRET = process.env.QR_TOKEN_SECRET || process.env.JWT_SECRET;

const signTicketToken = (ticketId, eventId, attendeeId) => {
  return jwt.sign({ ticketId, eventId, attendeeId }, QR_SECRET);
};

const verifyTicketToken = (token) => {
  try {
    return jwt.verify(token, QR_SECRET);
  } catch (error) {
    return null;
  }
};

module.exports = { signTicketToken, verifyTicketToken };
