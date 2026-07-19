// Free-tier LLM fallback chain for the chatbot's natural-language phrasing.
// Groq is tried first (fast, generous free tier), then Gemini. Both are called
// with plain fetch to avoid adding an SDK dependency. If neither is configured
// or both fail, generateReply returns null so the caller can fall back to its
// own rule-based response — this layer must never be a hard requirement.
const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GROQ_MODEL = process.env.GROQ_MODEL || "llama-3.1-8b-instant";
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-2.0-flash";

const TIMEOUT_MS = 8000;

const fetchWithTimeout = async (url, options) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
};

const callGroq = async (systemPrompt, userPrompt) => {
  if (!GROQ_API_KEY) return null;
  const res = await fetchWithTimeout("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${GROQ_API_KEY}`,
    },
    body: JSON.stringify({
      model: GROQ_MODEL,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.3,
      max_tokens: 200,
    }),
  });
  if (!res.ok) throw new Error(`Groq responded ${res.status}`);
  const data = await res.json();
  return data.choices?.[0]?.message?.content?.trim() || null;
};

const callGemini = async (systemPrompt, userPrompt) => {
  if (!GEMINI_API_KEY) return null;
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;
  const res = await fetchWithTimeout(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: `${systemPrompt}\n\n${userPrompt}` }] }],
      generationConfig: { temperature: 0.3, maxOutputTokens: 200 },
    }),
  });
  if (!res.ok) throw new Error(`Gemini responded ${res.status}`);
  const data = await res.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || null;
};

const PROVIDERS = [
  { name: "groq", call: callGroq },
  { name: "gemini", call: callGemini },
];

const generateReply = async (systemPrompt, userPrompt) => {
  for (const provider of PROVIDERS) {
    try {
      const reply = await provider.call(systemPrompt, userPrompt);
      if (reply) return reply;
    } catch (error) {
      console.error(`[ai] ${provider.name} failed: ${error.message}`);
    }
  }
  return null;
};

module.exports = { generateReply };
