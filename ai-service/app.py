"""EventNexus AI service (FastAPI).

The ML brain for the EventNexus stack, per the project report (PDF §3.5):
AI deployed through a mixture of TensorFlow.js / Node.js inference and
Python ML packages (Scikit-learn) — the Node backend orchestrates, this
service owns the trained models.

Endpoints
---------
GET  /health                model availability + service status
POST /predict-attendance    batch attendance forecast for events
POST /recommendations       collaborative-filtering ranking for a user
POST /classify-intent       ML intent classification (hybrid chatbot)
POST /parse                 intent (ML) + slots (rules) in one call — fast,
                             non-LLM; used internally as /understand's
                             fallback and directly for automated relabeling
POST /understand            LLM-first: intent + every slot in one call,
                             reading the actual conversation — the
                             backend's PRIMARY NLU entry point
POST /generate              generic Groq/Gemini call (prompt in, reply out)
POST /log-intent            label (message, intent) pairs for retraining
POST /train                 retrain all models from MongoDB
POST /collaboration-match   batch co-host likelihood for event pairs —
                            the advanced half of the AI collaboration
                            suggestions (Node falls back to its heuristic
                            scorer when this model is absent)
"""

import os
import json
import re

import joblib
import numpy as np
from bson import ObjectId
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

import db as data
from features import build_rows, build_pair_rows, cosine_texts, event_text
from llm import generate_reply
from nlu import extract_slots
import train as training

load_dotenv()

app = FastAPI(title="EventNexus AI Service", version="1.0.0")

_attendance = None
_cf = None
_intent = None
_match = None

# Closed intent set shared with the backend chatbot; used to validate
# labels an admin assigns in the training-data console.
KNOWN_INTENTS = {
    "recommend", "near_me", "my_tickets", "pricing", "organizer",
    "upcoming_events", "venue", "schedule", "registration_status",
    "popular_events", "capacity", "cancellation", "greeting", "categories",
    "event_count", "create_event", "join_event", "fallback",
}


class AttendanceRequest(BaseModel):
    events: list[dict]


class RecommendationsRequest(BaseModel):
    user_id: str
    organization_id: str | None = None


class ClassifyRequest(BaseModel):
    message: str


class ParseRequest(BaseModel):
    message: str


class UnderstandRequest(BaseModel):
    message: str
    history: list[dict] | None = None


class GenerateRequest(BaseModel):
    system_prompt: str
    user_prompt: str
    history: list[dict] | None = None


class LogIntentRequest(BaseModel):
    message: str
    intent: str


class PatchChatlogRequest(BaseModel):
    intent: str


class CollabMatchRequest(BaseModel):
    pairs: list[dict]


def _load_models():
    global _attendance, _cf, _intent, _match
    _attendance = joblib.load(training.ATTENDANCE_PATH) if os.path.exists(training.ATTENDANCE_PATH) else None
    _cf = joblib.load(training.CF_PATH) if os.path.exists(training.CF_PATH) else None
    _intent = joblib.load(training.INTENT_PATH) if os.path.exists(training.INTENT_PATH) else None
    _match = joblib.load(training.MATCH_PATH) if os.path.exists(training.MATCH_PATH) else None


@app.on_event("startup")
def _startup():
    # Auto-train on startup when any model is missing (cold start). Models
    # already present are left untouched to keep boot fast; retrain via /train.
    missing = [
        name
        for name, path in [
            ("attendance", training.ATTENDANCE_PATH),
            ("cf", training.CF_PATH),
            ("intent", training.INTENT_PATH),
            ("collaboration_match", training.MATCH_PATH),
        ]
        if not os.path.exists(path)
    ]
    if missing:
        print(f"[startup] missing models: {missing} -> training")
        training.train_all()
    _load_models()


@app.get("/health")
def health():
    return {
        "status": "ok",
        "models": {
            "attendance": _attendance is not None,
            "cf": _cf is not None,
            "intent": _intent is not None,
            "collaboration": _match is not None,
        },
    }


@app.post("/train")
def retrain():
    results = training.train_all()
    _load_models()
    return results


def _read_meta():
    try:
        with open(training.META_PATH) as fh:
            return json.load(fh)
    except (OSError, json.JSONDecodeError):
        return {"models": {}}


@app.get("/stats")
def stats():
    """Model metadata + training-data counts + intent distribution — powers
    the admin training console."""
    meta = _read_meta()
    events = list(data.get_db().events.find({}, {"status": 1}))
    chatlog = data.load_chat_log()
    distribution = {}
    for c in chatlog:
        intent = c.get("intent")
        distribution[intent] = distribution.get(intent, 0) + 1

    return {
        "models": meta.get("models", {}),
        "data": {
            "events": len(events),
            "pastEvents": sum(1 for e in events if e.get("status") == "Past"),
            "upcomingEvents": sum(1 for e in events if e.get("status") in ("Upcoming", "Live")),
            "tickets": data.get_db().tickets.count_documents({}),
            "chatlog": len(chatlog),
            "collabPairs": len(data.load_collab_pairs()[0]),
        },
        "intentDistribution": distribution,
    }


@app.get("/chatlog")
def list_chatlog(limit: int = 50, offset: int = 0, intent: str | None = None, search: str | None = None):
    """Labeled (message -> intent) training samples, newest first."""
    query = {}
    if intent:
        query["intent"] = intent
    if search:
        query["message"] = {"$regex": re.escape(search), "$options": "i"}
    cursor = (
        data.get_db().chatlog.find(query)
        .sort("_id", -1)
        .skip(max(0, offset))
        .limit(min(limit, 200))
    )
    return {
        "total": data.get_db().chatlog.count_documents(query),
        "samples": [
            {
                "id": str(s["_id"]),
                "message": s.get("message", ""),
                "intent": s.get("intent", ""),
                "createdAt": s.get("createdAt", "").isoformat() if s.get("createdAt") else None,
            }
            for s in cursor
        ],
    }


@app.patch("/chatlog/{sample_id}")
def patch_chatlog(sample_id: str, req: PatchChatlogRequest):
    """Fix a mislabeled training sample; takes effect on next /train."""
    if req.intent not in KNOWN_INTENTS:
        raise HTTPException(status_code=400, detail=f"intent must be one of: {sorted(KNOWN_INTENTS)}")
    try:
        _id = ObjectId(sample_id)
    except Exception:
        raise HTTPException(status_code=400, detail="invalid sample id")
    result = data.get_db().chatlog.update_one({"_id": _id}, {"$set": {"intent": req.intent}})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="sample not found")
    return {"ok": True}


@app.delete("/chatlog/{sample_id}")
def delete_chatlog(sample_id: str):
    """Remove a training sample (noise, PII, duplicates)."""
    try:
        _id = ObjectId(sample_id)
    except Exception:
        raise HTTPException(status_code=400, detail="invalid sample id")
    result = data.get_db().chatlog.delete_one({"_id": _id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="sample not found")
    return {"ok": True}


@app.post("/predict-attendance")
def predict_attendance(req: AttendanceRequest):
    """Batch forecast: returns one prediction per event, clipped to [0, capacity]."""
    if _attendance is None:
        return {"predictions": []}
    model = _attendance["model"]
    X, ids = build_rows(req.events)
    if X.shape[0] == 0:
        return {"predictions": []}
    preds = model.predict(X)
    capacity_by_id = {str(e.get("_id")): e.get("capacity") for e in req.events}
    out = []
    for i, eid in enumerate(ids):
        cap = capacity_by_id.get(eid)
        clipped = float(np.clip(preds[i], 0, cap if cap and cap > 0 else preds[i]))
        out.append({"event_id": eid, "predicted": round(clipped)})
    return {"predictions": out}


@app.post("/collaboration-match")
def collaboration_match(req: CollabMatchRequest):
    """Batch co-host likelihood for event pairs.

    The ML half of AI collaboration suggestions: each pair gets a calibrated-
    by-training probability that the two organizations would co-host those
    events together (RandomForest over structural features + TF-IDF content
    cosine). Returns matches in input order; when the model is absent (cold
    start — not enough real accept/decline decisions yet), returns an empty
    list and the Node backend uses its deterministic scorer instead.
    """
    if _match is None:
        return {"matches": []}
    model, vectorizer = _match["model"], _match["vectorizer"]

    X, ids = build_pair_rows(req.pairs)
    if X.shape[0] == 0:
        return {"matches": []}

    # build_pair_rows drops malformed pairs, so X is aligned with `ids`, not
    # with req.pairs — map each pair id to its row index for the text fill.
    row_index = {pid: i for i, pid in enumerate(ids)}
    for pair in req.pairs:
        pid = pair.get("id") or pair.get("pair_id")
        idx = row_index.get(pid)
        if idx is None:
            continue
        a, b = pair.get("event_a"), pair.get("event_b")
        if not a or not b:
            continue
        X[idx, 7] = cosine_texts(vectorizer, event_text(a), event_text(b))

    probs = model.predict_proba(X)
    pos_col = list(model.classes_).index(1)
    return {
        "matches": [
            {
                "id": ids[i],
                "score": round(float(probs[i][pos_col]), 4),
                "source": "ml",
            }
            for i in range(X.shape[0])
            if ids[i]
        ]
    }


@app.post("/recommendations")
def recommendations(req: RecommendationsRequest):
    """Collaborative-filtering ranking for one user.

    Returns has_cf=false on cold start (user unknown to the model), so the
    Node backend can fall back to its deterministic scorer.
    """
    if _cf is None:
        return {"has_cf": False, "recommendations": []}

    uid = str(req.user_id)
    if uid not in _cf["uid"]:
        return {"has_cf": False, "recommendations": []}

    user_idx = _cf["uid"][uid]
    user_vec = _cf["user_latent"][user_idx : user_idx + 1]
    distances, indices = _cf["nn"].kneighbors(user_vec)

    candidates = {str(e.get("_id")): e for e in data.load_upcoming_events(req.organization_id)}

    # Exclude events the user already interacted with (matrix value > 0).
    attended = set(
        e
        for e, v in zip(_cf["events"], np.asarray(_cf["matrix"][user_idx].todense()).ravel())
        if v > 0
    )

    scored = []
    for dist, idx in zip(distances[0], indices[0]):
        event_id = _cf["events"][int(idx)]
        if event_id in attended or event_id not in candidates:
            continue
        score = float(1.0 - dist)
        if score <= 0:
            continue
        scored.append({"event_id": event_id, "score": round(score, 4)})

    scored.sort(key=lambda s: s["score"], reverse=True)
    return {"has_cf": True, "recommendations": scored[:30]}


@app.post("/classify-intent")
def classify_intent(req: ClassifyRequest):
    """ML half of the hybrid chatbot: predict the closed intent set."""
    if _intent is None:
        return {"intent": None, "score": None}
    pipe = _intent
    text = (req.message or "").strip().lower()
    if not text:
        return {"intent": None, "score": None}
    scores = pipe.decision_function([text])[0]
    idx = int(np.argmax(scores))
    return {"intent": pipe.classes_[idx], "score": float(scores[idx])}


@app.post("/parse")
def parse(req: ParseRequest):
    """Unified NLU call: ML intent classification plus rule-based slot
    extraction (quantity/time-scope/price preference — see nlu.py for why
    those are rules, not a second model) in a single round trip, so the
    backend has one place to ask "what does this message mean" instead of
    juggling separate classify + regex logic across two languages."""
    text = (req.message or "").strip()
    classification = classify_intent(ClassifyRequest(message=text))
    return {
        "intent": classification["intent"],
        "score": classification["score"],
        "slots": extract_slots(text),
    }


def _extract_json(text: str) -> dict | None:
    """LLMs routinely wrap JSON in ```json fences or add a stray sentence
    before/after it — grab the first {...} block rather than requiring an
    exact match."""
    if not text:
        return None
    match = re.search(r"\{.*\}", text, re.S)
    if not match:
        return None
    try:
        return json.loads(match.group(0))
    except json.JSONDecodeError:
        return None


def _normalize_slots(parsed: dict) -> dict:
    """Never trust LLM output verbatim into the response — clamp every
    field to its actual valid range so a hallucinated value (a made-up
    string, an out-of-range number) can't reach the backend as if it were
    a confidently-detected slot."""
    quantity = parsed.get("quantity")
    time_scope = parsed.get("time_scope")
    price_pref = parsed.get("price_pref")
    count = parsed.get("count")
    return {
        "quantity": quantity if quantity in ("one", "many") else None,
        "time_scope": time_scope if time_scope in ("past", "upcoming") else None,
        "price_pref": price_pref if price_pref in ("free", "paid") else None,
        "count": count if isinstance(count, int) and 1 <= count <= 50 else None,
    }


@app.post("/understand")
def understand(req: UnderstandRequest):
    """LLM-first understanding: ONE call reads the message plus conversation
    history and returns intent + every slot together, instead of trying to
    anticipate every possible phrasing with more regex (a losing game — the
    English language has more phrasings than anyone can enumerate). This is
    the backend's primary NLU entry point; /parse's rule-based logic is used
    here only as the fallback when the LLM itself returns nothing usable
    (no API keys configured, both providers down, or a malformed response),
    so understanding still degrades gracefully rather than failing outright.
    """
    text = (req.message or "").strip()
    if not text:
        return {"intent": None, "slots": _normalize_slots({}), "source": None}

    system_prompt = (
        "You are the natural-language understanding layer for an event-management chatbot. "
        "Read the user's LATEST message together with the conversation history and reply with ONLY a single-line "
        "JSON object — no markdown fences, no explanation — with exactly these keys:\n"
        f'"intent": one of {sorted(KNOWN_INTENTS)},\n'
        '"quantity": "one" if they want ONE specific event, "many" if they want a list, else null,\n'
        '"time_scope": "past" if asking about past/concluded/finished events, "upcoming" if asking about '
        "upcoming/future events, else null,\n"
        '"price_pref": "free", "paid", or null,\n'
        '"count": an integer if they asked for a specific number of results (e.g. "10 events"), else null\n\n'
        "Resolve short follow-ups using the history — e.g. after the bot lists upcoming events, a reply of "
        '"just 1" means quantity="one"; "how about paid ones" means price_pref="paid" for the same time_scope '
         "as before. Use intent 'greeting' ONLY for an actual greeting or small talk with recognizable words "
        "('hi', 'hello', 'thanks', 'how are you', 'what can you do'). Use intent 'create_event' for any request to "
        "CREATE, HOST, PLAN, ORGANIZE, or PUBLISH a new event ('I want to host a workshop', 'how do I create an "
        "event', 'set up a new meetup') — but NOT a request to browse/list/recommend/count existing events, which "
        "belong to their own intents even if the word 'event' appears alongside a similar verb. Use intent "
        "'join_event' for any request to JOIN, REGISTER, SIGN UP, ENROLL, or BOOK an existing event "
        "('join Tech Conference', 'register me for the AI workshop', 'sign up for that event', 'I want to attend'). "
        "Use intent 'fallback' for EVERYTHING else that isn't genuinely one of the other labels — meta questions about the "
        "bot itself ('are you an AI?'), requests to DO something the bot can't do here that ISN'T event creation/joining "
        "(edit/delete an existing event, change account settings, issue refunds), AND unclear/nonsensical/"
        "unparseable text (random characters, gibberish, a message with no discernible words or intent). Never "
        "default confusing input to 'greeting' just because nothing else fits — 'fallback' triggers a real, "
        "tailored LLM answer downstream, while 'greeting' always returns the exact same canned reply, so "
        "misclassifying unclear messages as 'greeting' makes every unclear message look identical."
    )
    reply = generate_reply(system_prompt, text, req.history)
    parsed = _extract_json(reply)
    if parsed and parsed.get("intent") in KNOWN_INTENTS:
        return {"intent": parsed["intent"], "slots": _normalize_slots(parsed), "source": "llm"}

    # LLM unavailable or returned something unusable — deterministic fallback.
    classification = classify_intent(ClassifyRequest(message=text))
    return {"intent": classification["intent"], "slots": extract_slots(text), "source": "rules"}


@app.post("/generate")
def generate(req: GenerateRequest):
    """Generic Groq/Gemini call — this service's one LLM entry point (see
    llm.py). The backend builds the system/user prompt (it owns the
    grounded-data formatting that must never be paraphrased away — see the
    long comment in chatbotController.js about why grounded facts are
    returned verbatim, never LLM-rewritten); this just executes the call so
    the actual API keys and HTTP/retry logic for Groq and Gemini live in
    exactly one place instead of being duplicated in Node."""
    reply = generate_reply(req.system_prompt, req.user_prompt, req.history)
    return {"reply": reply}


@app.post("/log-intent")
def log_intent(req: LogIntentRequest):
    """Store a regex-confirmed (message, intent) label for retraining."""
    message = (req.message or "").strip().lower()
    if not message or not req.intent:
        return {"ok": False}
    data.insert_chat_log(message, req.intent)
    return {"ok": True}
