const express = require("express");
const { body } = require("express-validator");
const {
  register,
  login,
  googleLogin,
  getMe,
} = require("../controllers/authController");
const { protect } = require("../middleware/auth");
const validate = require("../middleware/validate");
const rateLimit = require("../middleware/rateLimit");

const router = express.Router();
// One bucket per endpoint — sharing a single limiter across login, register
// and google meant a burst on one blocked the other two as well.
const registerLimiter = rateLimit({ windowMs: 60_000, max: 10 });
const loginLimiter = rateLimit({ windowMs: 60_000, max: 10 });
const googleLimiter = rateLimit({ windowMs: 60_000, max: 10 });

router.post(
  "/register",
  registerLimiter,
  [
    body("name").notEmpty().withMessage("Name is required"),
    body("email").isEmail().withMessage("Valid email is required"),
    body("password")
      .isLength({ min: 6 })
      .withMessage("Password must be at least 6 characters"),
    body("role")
      .optional()
      .isIn(["admin", "organizer", "attendee"])
      .withMessage("Invalid role"),
    body("organizationId")
      .optional()
      .isMongoId()
      .withMessage("Invalid organization"),
    body("organizationName")
      .optional()
      .trim()
      .notEmpty()
      .withMessage("Organization name cannot be empty"),
  ],
  validate,
  register
);

router.post(
  "/login",
  loginLimiter,
  [
    body("email").isEmail().withMessage("Valid email is required"),
    body("password").notEmpty().withMessage("Password is required"),
  ],
  validate,
  login
);

router.post(
  "/google",
  googleLimiter,
  [body("credential").notEmpty().withMessage("Google credential is required")],
  validate,
  googleLogin
);

router.get("/me", protect, getMe);

module.exports = router;
