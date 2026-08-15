# EventNexus AI Service

Python ML service (FastAPI + scikit-learn) powering the three AI features of EventNexus. The Node backend (`backend/`) is the orchestrator; this service owns all *trained* models and exposes them over HTTP. Every call is best-effort — if this service is down or a model is missing, the backend silently falls back to its deterministic heuristics.

## Models

| Model | File | Purpose | Algorithm | Data |
|---|---|---|---|---|
| Attendance | `models/attendance.joblib` | Forecast final registered count for an event | HistGradientBoostingRegressor | Past events with registration history (min 5) |
| Recommendations | `models/cf.joblib` | Item-item collaborative filtering | TruncatedSVD → latent factors + NearestNeighbors | Ticket history (attendee × event implicit matrix) |
| Chatbot intent | `models/intent.joblib` | Classify user messages into chatbot intents | TF-IDF (word + char n-grams) + LinearSVC | Seed corpus + labeled app chat log (`chatlog` collection) |

Models train on the same MongoDB the backend uses (MongoDB URI set via `MONGODB_URI`). On startup, missing models are trained automatically. Retrain anytime with `POST /train`.

## Requirements

- Python 3.10+
- Access to the EventNexus MongoDB (Atlas in dev — copy `MONGODB_URI` from `backend/.env`)

## Quick start

```bash
# 1. Config (copy and edit; the backend shares the same DB)
cp .env.example .env

# 2. First run — creates .venv, installs deps, trains missing models, serves on :8000
./start.sh

# 3. Later runs — just serves
./start.sh
```

Run manually (no script):

```bash
python3 -m venv .venv
.venv/bin/pip install -r requirements.txt
.venv/bin/uvicorn app:app --host 0.0.0.0 --port 8000 --reload
```

## Environment

| Variable | Default | Description |
|---|---|---|
| `MONGODB_URI` | `mongodb://localhost:27017/eventnexus` | MongoDB for training data + chat-log curation |
| `AI_PORT` | `8000` | Port uvicorn listens on (used by `start.sh`) |
| `MODELS_DIR` | `./models` | Where trained `.joblib` artifacts + `meta.json` live |

## API

| Endpoint | Method | Description |
|---|---|---|
| `/health` | GET | Service + per-model availability (`{status, models}`) |
| `/train` | POST | Retrain all models from current DB data; returns per-model results |
| `/stats` | GET | Model metadata (`meta.json`), training-data counts, intent distribution |
| `/predict-attendance` | POST | Batch attendance forecast; body `{events: [{_id, title, ...}]}` → `{predictions: [{event_id, predicted}]}` (clipped to capacity) |
| `/recommendations` | POST | CF ranking; body `{user_id, organization_id}` → `{has_cf, recommendations: [{event_id, score}]}` |
| `/classify-intent` | POST | ML intent; body `{message}` → `{intent, score}` (uncalibrated margin, backend keeps only `score >= -0.5`) |
| `/log-intent` | POST | Store a (message, intent) label — fire-and-forget from the backend chatbot; feeds retraining |
| `/chatlog` | GET | List labeled training samples (`?limit=&offset=&intent=`), newest first |
| `/chatlog/{id}` | PATCH | Fix a sample's intent label (validated against known intents) |
| `/chatlog/{id}` | DELETE | Remove a noisy/duplicate sample |

## Training workflow

1. Chatbot messages that the backend's deterministic regex matches are auto-logged (`/log-intent`) — these are the raw training labels.
2. Admins curate the labels in the dashboard (**Admin → AI Training**): fix mislabels, delete noise.
3. `POST /train` (or the Retrain button in the admin console) refits all three models, writes `models/meta.json`, and hot-reloads them without a restart.

## Integration with the backend

- The backend calls this service through `backend/src/utils/aiClient.js` (base URL `http://localhost:8000`, configurable via `AI_SERVICE_URL`).
- Admin console routes in `backend/src/routes/ai.js` proxy `/stats`, `/train` and `/chatlog` behind the app's admin auth.
- Health is surfaced to users by the chatbot header indicator (Online / Partial / Fallback Mode).

## Debugging

```bash
curl localhost:8000/health
curl localhost:8000/stats
curl -X POST localhost:8000/train
curl -s -X POST localhost:8000/classify-intent -H "Content-Type: application/json" -d '{"message":"anything free nearby?"}'
```
