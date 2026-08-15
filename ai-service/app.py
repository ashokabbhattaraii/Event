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
POST /log-intent            label (message, intent) pairs for retraining
POST /train                 retrain all models from MongoDB
"""

import os
import json

import joblib
import numpy as np
from bson import ObjectId
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

import db as data
from features import build_rows
import train as training

load_dotenv()

app = FastAPI(title="EventNexus AI Service", version="1.0.0")

_attendance = None
_cf = None
_intent = None

# Closed intent set shared with the backend chatbot; used to validate
# labels an admin assigns in the training-data console.
KNOWN_INTENTS = {
    "recommend", "near_me", "my_tickets", "pricing", "organizer",
    "upcoming_events", "venue", "schedule", "registration_status",
    "popular_events", "capacity", "cancellation", "greeting", "categories",
    "event_count", "fallback",
}


class AttendanceRequest(BaseModel):
    events: list[dict]


class RecommendationsRequest(BaseModel):
    user_id: str
    organization_id: str


class ClassifyRequest(BaseModel):
    message: str


class LogIntentRequest(BaseModel):
    message: str
    intent: str


class PatchChatlogRequest(BaseModel):
    intent: str


def _load_models():
    global _attendance, _cf, _intent
    _attendance = joblib.load(training.ATTENDANCE_PATH) if os.path.exists(training.ATTENDANCE_PATH) else None
    _cf = joblib.load(training.CF_PATH) if os.path.exists(training.CF_PATH) else None
    _intent = joblib.load(training.INTENT_PATH) if os.path.exists(training.INTENT_PATH) else None


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
        },
        "intentDistribution": distribution,
    }


@app.get("/chatlog")
def list_chatlog(limit: int = 50, offset: int = 0, intent: str | None = None):
    """Labeled (message -> intent) training samples, newest first."""
    query = {"intent": intent} if intent else {}
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


@app.post("/log-intent")
def log_intent(req: LogIntentRequest):
    """Store a regex-confirmed (message, intent) label for retraining."""
    message = (req.message or "").strip().lower()
    if not message or not req.intent:
        return {"ok": False}
    data.insert_chat_log(message, req.intent)
    return {"ok": True}
