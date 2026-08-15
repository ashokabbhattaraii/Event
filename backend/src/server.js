require("dotenv").config();
const express = require("express");
const cors = require("cors");
const connectDB = require("./config/db");
const authRoutes = require("./routes/auth");
const eventRoutes = require("./routes/events");
const organizationRoutes = require("./routes/organizations");
const ticketRoutes = require("./routes/tickets");
const userRoutes = require("./routes/users");
const notificationRoutes = require("./routes/notifications");
const recommendationRoutes = require("./routes/recommendations");
const analyticsRoutes = require("./routes/analytics");
const chatbotRoutes = require("./routes/chatbot");
const paymentRoutes = require("./routes/payments");
const aiRoutes = require("./routes/ai");
const { handleWebhook } = require("./controllers/paymentController");
const aiHealth = require("./utils/aiClient").health;

const app = express();

connectDB();

app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    credentials: true,
  })
);

// Stripe needs the raw, unparsed body to verify the webhook signature, so
// this route is registered with express.raw() *before* the global
// express.json() body parser below.
app.post(
  "/api/payments/webhook",
  express.raw({ type: "application/json" }),
  handleWebhook
);

// Raised from the default 100kb so event cover images (sent as base64 data
// URLs, since no object-storage provider is configured) fit in the body —
// the frontend downsizes images client-side before sending, well under this.
app.use(express.json({ limit: "8mb" }));

app.use("/api/auth", authRoutes);
app.use("/api/events", eventRoutes);
app.use("/api/organizations", organizationRoutes);
app.use("/api/tickets", ticketRoutes);
app.use("/api/users", userRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/recommendations", recommendationRoutes);
app.use("/api/analytics", analyticsRoutes);
app.use("/api/chatbot", chatbotRoutes);
app.use("/api/payments", paymentRoutes);

// AI health probe is public (used by status indicators/landing page), so it
// must be registered BEFORE the admin-protected /api/ai router mounts below —
// mounted after, the router's protect middleware swallows it with a 401.
app.get("/api/ai/health", async (req, res) => {
  const health = await aiHealth();
  res.json(health ?? { online: false, attendance: false, cf: false, intent: false });
});

// Admin-only AI training console (proxies the Python AI service).
app.use("/api/ai", aiRoutes);

app.get("/api/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
