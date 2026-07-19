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

const app = express();

connectDB();

app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    credentials: true,
  })
);
app.use(express.json());

app.use("/api/auth", authRoutes);
app.use("/api/events", eventRoutes);
app.use("/api/organizations", organizationRoutes);
app.use("/api/tickets", ticketRoutes);
app.use("/api/users", userRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/recommendations", recommendationRoutes);
app.use("/api/analytics", analyticsRoutes);
app.use("/api/chatbot", chatbotRoutes);

app.get("/api/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
