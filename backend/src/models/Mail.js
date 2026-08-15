const mongoose = require("mongoose");

// Development-mode email log. In dev there is no SMTP server — "sent" emails
// (verification links, password resets, registration confirmations) are
// written here and printed to the server console so the full flow can be
// exercised locally. Swap utils/email.js sendMail() with a real provider in
// production without touching controllers.
const mailSchema = new mongoose.Schema(
  {
    to: { type: String, required: true, index: true },
    subject: { type: String, required: true },
    template: String,
    text: String,
    html: String,
    metadata: {},
  },
  { timestamps: true }
);

module.exports = mongoose.model("Mail", mailSchema);
