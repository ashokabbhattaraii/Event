const express = require("express");
const { body } = require("express-validator");
const { query, getSuggestions } = require("../controllers/chatbotController");
const { protect } = require("../middleware/auth");
const validate = require("../middleware/validate");

const router = express.Router();

router.post(
  "/query",
  protect,
  [body("message").notEmpty().withMessage("message is required")],
  validate,
  query
);

router.get("/suggestions", protect, getSuggestions);

module.exports = router;
