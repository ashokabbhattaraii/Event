const { validationResult } = require("express-validator");
const { sanitizeRequest } = require("./sanitize");

// req.{body,query,params} are already sanitized globally (server.js mounts
// sanitizeRequest before any route) — this just runs express-validator's
// checks. Re-running sanitizeRequest here is cheap and keeps this file
// correct standalone if it's ever used without the global middleware.
const validate = (req, res, next) => {
  sanitizeRequest(req, res, () => {});

  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      message: errors.array()[0].msg,
      errors: errors.array(),
    });
  }
  next();
};

module.exports = validate;
