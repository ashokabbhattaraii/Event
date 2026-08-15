// Thin HTTP client for the Python AI service (ai-service/, FastAPI).
// Every call is best-effort: a failure (service down, timeout, no model)
// returns null so callers fall back to deterministic Node heuristics —
// the AI service augments accuracy, it never blocks the app.
//
// Config: AI_SERVICE_URL (default http://localhost:8000).

const AI_BASE = process.env.AI_SERVICE_URL || "http://localhost:8000";

const call = async (path, body, timeoutMs, method = "POST") => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  const isBodyless = method === "GET" || method === "HEAD";
  try {
    const res = await fetch(`${AI_BASE}${path}`, {
      method,
      headers: { "Content-Type": "application/json" },
      ...(isBodyless ? {} : { body: JSON.stringify(body) }),
      signal: controller.signal,
    });
    if (!res.ok) return null;
    return await res.json();
  } catch (error) {
    console.error(`[ai-service] ${path} failed: ${error.message}`);
    return null;
  } finally {
    clearTimeout(timeout);
  }
};

// Batch attendance forecast. Returns [{ event_id, predicted }] or null.
const predictAttendance = async (events, timeoutMs = 2000) => {
  const data = await call("/predict-attendance", { events }, timeoutMs);
  return data?.predictions || null;
};

// Collaborative-filtering ranking for a user.
// Returns { has_cf, recommendations: [{ event_id, score }] } or null.
const recommend = async (userId, organizationId, timeoutMs = 2500) => {
  const data = await call(
    "/recommendations",
    { user_id: userId, organization_id: organizationId },
    timeoutMs
  );
  if (!data) return null;
  return { has_cf: !!data.has_cf, recommendations: data.recommendations || [] };
};

// ML intent classification. Returns { intent, score } or null.
// LinearSVC margins are uncalibrated; accept only confidently-argmax picks
// (score >= -0.5) so weak guesses fall through to the LLM classifier.
const classifyIntent = async (message, timeoutMs = 1500) => {
  const data = await call("/classify-intent", { message }, timeoutMs);
  if (!data?.intent || data.score == null || data.score < -0.5) return null;
  return data;
};

// Service + model health. Returns null when the AI service is unreachable
// (app is then running in deterministic fallback mode).
const health = async (timeoutMs = 1500) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(`${AI_BASE}/health`, { signal: controller.signal });
    if (!res.ok) return null;
    const data = await res.json();
    const models = data?.models || {};
    return {
      online: true,
      attendance: !!models.attendance,
      cf: !!models.cf,
      intent: !!models.intent,
    };
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
};

// --- Admin console endpoints (backend proxies to the AI service) ---

// Model metadata + training-data stats for the admin console.
const getStats = async (timeoutMs = 2000) => {
  const data = await call("/stats", {}, timeoutMs, "GET");
  return data ?? null;
};

// Trigger full retraining of all models; returns per-model results.
const retrain = async (timeoutMs = 120000) => {
  const data = await call("/train", {}, timeoutMs);
  return data ?? null;
};

// Labeled (message -> intent) training samples, newest first.
const listChatlog = async ({ limit = 50, offset = 0, intent } = {}, timeoutMs = 3000) => {
  const qs = new URLSearchParams({ limit: String(limit), offset: String(offset) });
  if (intent) qs.set("intent", intent);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(`${AI_BASE}/chatlog?${qs}`, { signal: controller.signal });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
};

// Fix a mislabeled sample's intent (takes effect on next retrain).
const patchChatlog = async (sampleId, intent, timeoutMs = 3000) => {
  return call(`/chatlog/${sampleId}`, { intent }, timeoutMs, "PATCH");
};

// Remove a noisy/duplicate training sample (takes effect on next retrain).
const deleteChatlog = async (sampleId, timeoutMs = 3000) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(`${AI_BASE}/chatlog/${sampleId}`, { method: "DELETE", signal: controller.signal });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
};

// Fire-and-forget: label a regex-confirmed (message, intent) pair so the
// classifier self-improves on retrain. Never throws.
const logIntent = (message, intent) => {
  fetch(`${AI_BASE}/log-intent`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message, intent }),
  }).catch(() => {});
};

module.exports = {
  predictAttendance,
  recommend,
  classifyIntent,
  logIntent,
  health,
  getStats,
  retrain,
  listChatlog,
  patchChatlog,
  deleteChatlog,
};
