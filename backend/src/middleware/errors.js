// Standardized error handling (report §23): every failure leaves the API as
// { success: false, message, code?, errors? } — never an internal stack
// trace. Kept intentionally small so existing controllers (which mostly
// respond with { message }) remain compatible: this middleware normalizes
// anything thrown/nexted and guarantees the envelope + status codes.
const notFound = (req, res) => {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`,
    code: "NOT_FOUND",
  });
};

// Maps thrown errors to clean responses. Unknown errors stay generic and
// are logged server-side (the client never sees internals).
const errorHandler = (err, req, res, next) => {
  // Mongoose validation error
  if (err.name === "ValidationError") {
    return res.status(400).json({
      success: false,
      message: err.errors[Object.keys(err.errors)[0]]?.message || "Validation failed",
      code: "VALIDATION_ERROR",
      errors: Object.values(err.errors).map((e) => ({ field: e.path, message: e.message })),
    });
  }

  // Duplicate key (e.g. unique email / slug / partial index)
  if (err.code === 11000) {
    const field = Object.keys(err.keyPattern || {})[0] || "field";
    return res.status(409).json({
      success: false,
      message: `${field} already exists`,
      code: "DUPLICATE",
    });
  }

  // Invalid ObjectId / cast
  if (err.name === "CastError") {
    return res.status(400).json({
      success: false,
      message: `Invalid ${err.path}`,
      code: "INVALID_ID",
    });
  }

  // Errors thrown with an explicit status (e.g. AppError or res.status(...))
  if (err.statusCode) {
    return res.status(err.statusCode).json({
      success: false,
      message: err.message,
      code: err.code || "ERROR",
    });
  }

  console.error("[error]", err.message, err.stack);
  res.status(500).json({
    success: false,
    message: "Something went wrong",
    code: "INTERNAL_ERROR",
  });
};

// Wrap async route handlers so rejected promises reach errorHandler instead
// of crashing the process.
const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

module.exports = { notFound, errorHandler, asyncHandler };
