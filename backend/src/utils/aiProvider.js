// Gemini is the primary provider, Groq the fallback. Gemini (gemini-2.5-flash)
// gives better instruction-following for structured replies (markdown tables,
// links); Groq covers it with low latency if Gemini is down or unset.
const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GROQ_MODEL = process.env.GROQ_MODEL || "llama-3.1-8b-instant";
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-flash-latest";

const TIMEOUT_MS = 10000
const MAX_RETRIES = 2

const fetchWithTimeout = async (url, options) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
};

const callGroq = async (messages) => {
  if (!GROQ_API_KEY) return null;
  const res = await fetchWithTimeout("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${GROQ_API_KEY}`,
    },
    body: JSON.stringify({
      model: GROQ_MODEL,
      messages,
      temperature: 0.2,
      max_tokens: 700,
      top_p: 0.9,
    }),
  });
  if (!res.ok) throw new Error(`Groq responded ${res.status}`);
  const data = await res.json();
  return data.choices?.[0]?.message?.content?.trim() || null;
};

const callGemini = async (messages) => {
  if (!GEMINI_API_KEY) return null;
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;
  // Gemini's API takes contents as alternating role parts; fold the system
  // prompt into the first user turn (Gemini has no system role in v1beta).
  const contents = messages.map((m) => ({
    role: m.role === "system" ? "user" : m.role,
    parts: [{ text: m.content }],
  }));
  if (messages[0]?.role === "system") {
    // Fold system prompt into the first user turn, then drop the original
    // first user message so nothing is duplicated: [system, user, ...] -> [user(system+user), ...]
    contents[0].parts = [{ text: `${messages[0].content}\n\n${messages[1]?.content ?? ""}` }];
    contents.splice(1, 1);
  }
  const res = await fetchWithTimeout(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents,
      generationConfig: {
        temperature: 0.2,
        maxOutputTokens: 700,
        topP: 0.9,
      },
    }),
  });
  if (!res.ok) throw new Error(`Gemini responded ${res.status}`);
  const data = await res.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || null;
};

// Gemini first (primary), Groq second (fallback) — see header comment.
const PROVIDERS = [
  { name: "gemini", call: callGemini },
  { name: "groq", call: callGroq },
];

// history: optional [{ role: "user" | "assistant", content }] so the model
// sees the conversation so far (context), not just the latest message.
const generateReply = async (systemPrompt, userPrompt, history = []) => {
  const messages = [
    { role: "system", content: systemPrompt },
    ...history.map((h) => ({ role: h.role === "assistant" ? "assistant" : "user", content: h.content })),
    { role: "user", content: userPrompt },
  ];
  for (const provider of PROVIDERS) {
    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      try {
        const reply = await provider.call(messages);
        if (reply) return reply;
      } catch (error) {
        console.error(`[ai] ${provider.name} attempt ${attempt + 1} failed: ${error.message}`);
        if (attempt < MAX_RETRIES - 1) {
          await new Promise(r => setTimeout(r, 500 * (attempt + 1)));
        }
      }
    }
  }
  return null;
};

const generateEventInsight = async (event) => {
  const systemPrompt =
    "You are EventNexus AI, an event analytics assistant. " +
    "Generate a concise, data-driven insight (1-2 sentences) about the event's current demand and registration trends. " +
    "Use ONLY the facts provided. Be precise and helpful. Never invent data.";

  const userPrompt = [
    "Event:", event.title,
    "Category:", event.category,
    "Type:", event.type,
    "Capacity:", event.capacity,
    "Registered:", event.registered,
    "Status:", event.status,
    "Days until event:", event.daysUntil,
  ].join("\n");

  return generateReply(systemPrompt, userPrompt);
};

module.exports = { generateReply, generateEventInsight };
