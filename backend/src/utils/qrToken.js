const jwt = require("jsonwebtoken");

const getQrSecret = () => {
  // Prefer dedicated QR secret; fallback to JWT_SECRET only in development.
  // Warn loudly if QR_TOKEN_SECRET is missing in production so rotation of
  // the session secret does not silently invalidate/forge tickets.
  if (process.env.QR_TOKEN_SECRET) return process.env.QR_TOKEN_SECRET;
  if (process.env.NODE_ENV === "production" && !process.env.QR_TOKEN_SECRET) {
    console.warn("[qrToken] QR_TOKEN_SECRET not set — falling back to JWT_SECRET (not recommended for production)");
  }
  if (!process.env.JWT_SECRET) throw new Error("JWT_SECRET is required for QR token fallback");
  return process.env.JWT_SECRET;
};

const signTicketToken = (ticketId, eventId, attendeeId) => {
  return jwt.sign({ ticketId, eventId, attendeeId }, getQrSecret());
};

const verifyTicketToken = (token) => {
  try {
    return jwt.verify(token, getQrSecret());
  } catch (error) {
    return null;
  }
};

module.exports = { signTicketToken, verifyTicketToken };
