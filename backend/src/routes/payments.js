const express = require("express");
const {
  getPaymentConfig,
  createCheckoutSession,
  getCheckoutStatus,
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

module.exports = router;
