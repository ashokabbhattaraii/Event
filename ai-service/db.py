"""MongoDB access for the AI service.

The service reads the EventNexus database directly (pymongo) so models are
trained on the same history the app actually produced — no data plumbing
through Node. Collection names mirror backend/src/models/*.js.

Collections used:
  - events:   Event documents (training target + candidate pool)
  - tickets:  attendee x event interactions (collaborative filtering)
  - users:    attendee profiles (location, name)
  - chatlog:  labeled (message -> intent) pairs (hybrid chatbot classifier)
"""

import os

from dotenv import load_dotenv
from pymongo import MongoClient

load_dotenv()

MONGODB_URI = os.getenv("MONGODB_URI", "mongodb://localhost:27017/eventnexus")

_client = None


def get_db():
    global _client
    if _client is None:
        _client = MongoClient(MONGODB_URI, serverSelectionTimeoutMS=3000)
    return _client.eventnexus


def load_past_events():
    """Events that already happened, with their final attendance."""
    return list(
        get_db().events.find(
            {"status": "Past", "registered": {"$gte": 0}},
            {"title": 1, "category": 1, "type": 1, "capacity": 1, "registered": 1,
             "createdAt": 1, "date": 1, "organization": 1},
        )
    )


def load_upcoming_events(organization_id=None):
    """Candidate pool for recommendations / predictions.

    Live events stay candidates even when their stored date has passed
    midnight (a festival seeded "today" is still happening) — a plain
    `date >= now` filter would silently drop them.
    """
    query = {
        "status": {"$in": ["Upcoming", "Live"]},
        "$or": [{"status": "Live"}, {"date": {"$gte": __now_iso()}}],
    }
    if organization_id:
        query["organization"] = _oid(organization_id)
    return list(
        get_db().events.find(
            query,
            {"title": 1, "category": 1, "type": 1, "capacity": 1, "registered": 1,
             "createdAt": 1, "date": 1, "organization": 1, "coordinates": 1},
        )
    )


def load_tickets():
    """All attendee x event interactions (implicit feedback from bookings)."""
    return list(
        get_db().tickets.find(
            {"status": {"$ne": "cancelled"}},
            {"attendee": 1, "event": 1, "status": 1, "createdAt": 1},
        )
    )


def load_chat_log():
    """Labeled (message, intent) pairs accumulated by the app."""
    return list(get_db().chatlog.find({}, {"message": 1, "intent": 1}))


def insert_chat_log(message, intent):
    from datetime import datetime, timezone

    get_db().chatlog.insert_one(
        {"message": message, "intent": intent, "createdAt": datetime.now(timezone.utc)}
    )


def __now_iso():
    from datetime import datetime, timezone

    return datetime.now(timezone.utc)


def _oid(value):
    from bson import ObjectId

    if isinstance(value, ObjectId):
        return value
    return ObjectId(str(value))
