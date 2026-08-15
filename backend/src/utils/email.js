const Mail = require("../models/Mail");

// Dev-mode mailer: logs the message to the server console and records it in
// the Mail collection. Swap the body for a real transport (SMTP, Resend,
// SendGrid…) in production — controllers only call sendMail().
const sendMail = async ({ to, subject, template, text, html, metadata }) => {
  const mail = await Mail.create({ to, subject, template, text, html, metadata });

  console.log("\n  ┌──────────────── [mail:dev] ───────────────┐");
  console.log(`  │ To:      ${to}`);
  console.log(`  │ Subject: ${subject}`);
  if (text) console.log(`  │ ${text.split("\n").join("\n  │ ")}`);
  console.log("  └───────────────────────────────────────────┘\n");
  return mail;
};

module.exports = { sendMail };
