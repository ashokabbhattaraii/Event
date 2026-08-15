const { validationResult } = require("express-validator");

// Recursively strips MongoDB query operators ("$where", "$gt", ...) and
// dotted keys from untrusted input so attacker-supplied bodies/params can
// never inject operators into mongoose queries (NoSQL injection guard).
const sanitize = (value, depth = 0) => {
  if (value == null || depth > 6) return value;
  if (Array.isArray(value)) return value.map((v) => sanitize(v, depth + 1));
  if (typeof value === "object") {
    const out = {};
    for (const [key, val] of Object.entries(value)) {
      if (key.startsWith("$") || key.includes(".")) continue;
      out[key] = sanitize(val, depth + 1);
    }
    return out;
  }
  return value;
};

const validate = (req, res, next) => {
  if (req.body && typeof req.body === "object") req.body = sanitize(req.body);
  if (req.query && typeof req.query === "object") req.query = sanitize(req.query);
  if (req.params && typeof req.params === "object") req.params = sanitize(req.params);

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
