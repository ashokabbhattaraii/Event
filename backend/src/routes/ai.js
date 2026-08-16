// Admin-only AI console API. Proxies the Python AI service (ai-service/)
// behind the app's auth so admins can inspect, retrain and curate the
// models from the dashboard UI.
const express = require("express");
const { protect, requireRole } = require("../middleware/auth");
const ai = require("../utils/aiClient");

const router = express.Router();

// All AI-management routes are admin-only.
router.use(protect, requireRole("admin"));

// Combined service health + model metadata + training-data stats.
router.get("/status", async (req, res) => {
  const [health, stats] = await Promise.all([ai.health(), ai.getStats()]);
  res.json({
    health: health ?? { online: false, attendance: false, cf: false, intent: false },
    stats: stats ?? null,
  });
});

// Retrain all models from current DB data.
router.post("/train", async (req, res) => {
  const results = await ai.retrain();
  if (!results) return res.status(502).json({ message: "AI service unreachable" });
  res.json(results);
});

// Labeled training samples (message -> intent), newest first.
router.get("/chatlog", async (req, res) => {
  const { limit, offset, intent, search } = req.query;
  const data = await ai.listChatlog({
    limit: parseInt(limit, 10) || 50,
    offset: parseInt(offset, 10) || 0,
    intent,
    search,
  });
  if (!data) return res.status(502).json({ message: "AI service unreachable" });
  res.json(data);
});

// Fix a mislabeled sample's intent.
router.patch("/chatlog/:id", async (req, res) => {
  const { id } = req.params;
  const { intent } = req.body || {};
  if (!intent || typeof intent !== "string") {
    return res.status(400).json({ message: "intent is required" });
  }
  const result = await ai.patchChatlog(id, intent);
  if (!result) return res.status(502).json({ message: "AI service unreachable" });
  if (!result.ok) return res.status(400).json({ message: "could not update sample" });
  res.json(result);
});

// Remove a noisy/duplicate training sample.
router.delete("/chatlog/:id", async (req, res) => {
  const result = await ai.deleteChatlog(req.params.id);
  if (!result) return res.status(502).json({ message: "AI service unreachable" });
  if (!result.ok) return res.status(400).json({ message: "could not delete sample" });
  res.json(result);
});

// Playground: classify a message with the trained ML model.
router.post("/classify", async (req, res) => {
  const { message } = req.body || {};
  if (!message || typeof message !== "string") {
    return res.status(400).json({ message: "message is required" });
  }
  const result = await ai.classifyIntent(message, 3000);
  res.json(result ?? { intent: null, score: null });
});

module.exports = router;
