const jwt = require("jsonwebtoken");

// Access tokens carry the user's current tokenVersion so protect() can
// reject tokens minted before a privilege change (role/password). Callers
// pass the user's tokenVersion at login/refresh time.
const generateToken = (userId, tokenVersion = 0) => {
  return jwt.sign({ id: userId, ver: tokenVersion }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  });
};

module.exports = generateToken;
