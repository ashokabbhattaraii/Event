const express = require("express");
const {
  getPaymentConfig,
  createCheckoutSession,
  getCheckoutStatus,
  initiateEsewaPayment,
  handleEsewaSuccess,
  handleEsewaFailure,
} = require("../controllers/paymentController");
const { protect, requireRole } = require("../middleware/auth");
const rateLimit = require("../middleware/rateLimit");

const checkoutLimiter = rateLimit({ windowMs: 60_000, max: 15 });

const router = express.Router();

router.get("/config", getPaymentConfig);
router.post(
  "/checkout/:id",
  protect,
  requireRole("attendee"),
  checkoutLimiter,
  createCheckoutSession
);
router.get("/checkout/status/:sessionId", protect, requireRole("attendee"), getCheckoutStatus);

router.post(
  "/esewa/initiate/:id",
  protect,
  requireRole("attendee"),
  checkoutLimiter,
  initiateEsewaPayment
);
// eSewa redirects the user's browser to these directly (GET, no auth
// header available), so they're intentionally public — ticket issuance
// itself is still gated behind signature verification + a server-to-server
// status check inside the controller, not the redirect alone.
router.get("/esewa/success", handleEsewaSuccess);
router.get("/esewa/failure", handleEsewaFailure);

module.exports = router;
