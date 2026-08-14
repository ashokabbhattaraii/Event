const express = require("express");
const { body } = require("express-validator");
const { getMyTickets, cancelTicket, verifyTicket } = require("../controllers/ticketController");
const { protect, requireRole } = require("../middleware/auth");
const validate = require("../middleware/validate");

const router = express.Router();

router.get("/my", protect, requireRole("attendee"), getMyTickets);

router.post("/:id/cancel", protect, requireRole("attendee"), cancelTicket);

router.post(
  "/verify",
  protect,
  requireRole("organizer", "admin"),
  [body("qrToken").notEmpty().withMessage("qrToken is required")],
  validate,
  verifyTicket
);

module.exports = router;
