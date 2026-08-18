"""Feature builders shared by training and inference.

The attendance model is trained on *past* events (we know their final
attendance) and predicts *upcoming* ones. Both sides must compute identical
features from the same raw event fields, so there is exactly one function
per feature and one row-builder used everywhere.
"""

import numpy as np
from datetime import datetime, timezone

# Categories/types are treated as opaque categoricals; the encoder maps
# unseen values to -1 at inference so the model never sees new categories.
_ALL_CATEGORIES = [
    "Technology", "Music", "Workshop", "Conference", "Networking", "Seminar",
    "Sports", "Cultural", "Business", "Education", "Health", "Food", "Art",
]
_ALL_TYPES = ["In-person", "Hybrid", "Virtual"]


def _now():
    return datetime.now(timezone.utc)


def _ts(value):
    if value is None:
        return None
    if isinstance(value, datetime):
        return value.timestamp()
    # mongo sends datetimes as ISO strings through JSON
    if isinstance(value, str):
        try:
            return datetime.fromisoformat(value.replace("Z", "+00:00")).timestamp()
        except ValueError:
            return None
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


def days_since_created(event):
    ts = _ts(event.get("createdAt"))
    if ts is None:
        return None
    return max(1.0, (_now().timestamp() - ts) / 86400.0)


def days_until_event(event):
    ts = _ts(event.get("date"))
    if ts is None:
        return None
    return max(0.0, (ts - _now().timestamp()) / 86400.0)


def build_rows(events):
    """One feature row per event.

    Returns (X, ids) where X has shape (n, n_features) with feature order
    fixed for model persistence. Rows with missing core fields are dropped.
    """
    rows = []
    ids = []
    for e in events:
        cap = e.get("capacity")
        reg = e.get("registered", 0)
        d_created = days_since_created(e)
        d_until = days_until_event(e)
        if cap is None or cap <= 0 or d_created is None or d_until is None:
            continue
        category = e.get("category", "")
        etype = e.get("type", "")
        fill_rate = min(1.0, (reg or 0) / cap)
        rows.append(
            [
                d_created,
                d_until,
                cap,
                float(reg or 0),
                fill_rate,
                _cat_code(category),
                _type_code(etype),
            ]
        )
        ids.append(str(e.get("_id", "")))
    return np.asarray(rows, dtype=float), ids


def _cat_code(category):
    try:
        return _ALL_CATEGORIES.index(category)
    except ValueError:
        return -1


def _type_code(etype):
    try:
        return _ALL_TYPES.index(etype)
    except ValueError:
        return -1


FEATURE_NAMES = [
    "days_since_created",
    "days_until_event",
    "capacity",
    "registered_so_far",
    "fill_rate_so_far",
    "category",
    "type",
]

# --- Collaboration-match pair features --------------------------------------
# The match classifier (train.py's train_match) scores an EVENT PAIR — one
# feature row per pair. The heavy feature is the TF-IDF cosine similarity of
# the two events' free text (title + description + highlights + agenda +
# speakers + tags): the vectorizer is fitted on the whole training corpus and
# persisted inside the model artifact, so inference transforms with the exact
# same vocabulary.
PAIR_FEATURE_NAMES = [
    "same_category",        # 0/1
    "same_type",            # 0/1
    "days_apart",           # |dateA - dateB|, log-scaled (a "soon together" proxy)
    "same_city",            # 0/1, from each event's org city
    "same_country",         # 0/1, from each event's org country
    "geo_distance_km",      # haversine of venue coordinates (-1 when unknown)
    "capacity_ratio_log",   # |log2(capA / capB)| — similar scale → smaller
    "content_cosine",       # TF-IDF cosine of the two events' text, 0..1
    "tag_jaccard",          # Jaccard of tags, 0..1
    "fill_rate_delta",      # |fillA - fillB|, 0..1 — similar momentum
]


def _haversine_km(a, b):
    if not a or not b:
        return -1.0
    try:
        lat1, lng1 = float(a["lat"]), float(a["lng"])
        lat2, lng2 = float(b["lat"]), float(b["lng"])
    except (KeyError, TypeError, ValueError):
        return -1.0
    if not (-90 <= lat1 <= 90 and -90 <= lat2 <= 90 and -180 <= lng1 <= 180 and -180 <= lng2 <= 180):
        return -1.0
    import math

    dlat = math.radians(lat2 - lat1)
    dlng = math.radians(lng2 - lng1)
    h = (
        math.sin(dlat / 2) ** 2
        + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlng / 2) ** 2
    )
    return 6371.0 * 2 * math.asin(math.sqrt(h))


def event_text(event):
    """The free-text content of an event, lowercase — the input to TF-IDF."""
    pieces = [
        event.get("title", ""),
        event.get("description", ""),
        " ".join(event.get("highlights") or []),
        " ".join(a.get("title", "") + " " + a.get("description", "") for a in (event.get("agenda") or [])),
        " ".join(s.get("name", "") + " " + s.get("role", "") for s in (event.get("speakers") or [])),
        " ".join(event.get("tags") or []),
    ]
    return " ".join(p for p in pieces if p).lower()


def _tag_set(event):
    return set(t.lower() for t in (event.get("tags") or []) if isinstance(t, str))


def _jaccard(a, b):
    if not a or not b:
        return 0.0
    inter = len(a & b)
    union = len(a | b)
    return inter / union if union else 0.0


def _cap_ratio(a, b):
    ca = a.get("capacity")
    cb = b.get("capacity")
    if not ca or not cb:
        return 0.0
    return abs(np.log2(max(1, float(ca)) / max(1, float(cb))))


def _days_apart(a, b):
    ta = _ts(a.get("date"))
    tb = _ts(b.get("date"))
    if ta is None or tb is None:
        return 0.0
    days = abs(ta - tb) / 86400.0
    return float(np.log1p(days))


def _fill_rate(event):
    cap = event.get("capacity")
    if not cap:
        return 0.0
    return min(1.0, float(event.get("registered", 0)) / float(cap))


# (event_a, event_b) -> one feature row. Both events must have the core
# fields; pairs missing essentials are dropped by build_pair_rows below.
def build_pair_row(a, b):
    city_a = ((a.get("org") or {}).get("city") or "").lower().strip()
    city_b = ((b.get("org") or {}).get("city") or "").lower().strip()
    country_a = ((a.get("org") or {}).get("country") or "").lower().strip()
    country_b = ((b.get("org") or {}).get("country") or "").lower().strip()
    return [
        float(a.get("category", "").lower() == b.get("category", "").lower()),
        float(a.get("type", "") == b.get("type", "")),
        _days_apart(a, b),
        float(bool(city_a) and city_a == city_b),
        float(bool(country_a) and country_a == country_b),
        _haversine_km(a.get("coordinates"), b.get("coordinates")),
        _cap_ratio(a, b),
        0.0,  # content_cosine — filled by the caller's vectorizer
        _jaccard(_tag_set(a), _tag_set(b)),
        abs(_fill_rate(a) - _fill_rate(b)),
    ]


def build_pair_rows(pairs):
    """One row per (event_a, event_b) pair.

    Returns (X, pair_ids) with shape (n, n_features), dropping pairs that
    lack the core fields. content_cosine is filled in by the caller after
    vectorizing, because that depends on the fitted vocabulary.
    """
    rows = []
    ids = []
    for pair in pairs:
        a, b = pair.get("event_a"), pair.get("event_b")
        if not a or not b:
            continue
        row = build_pair_row(a, b)
        rows.append(row)
        ids.append(pair.get("id") or pair.get("pair_id") or "")
    if not rows:
        return np.zeros((0, len(PAIR_FEATURE_NAMES))), []
    return np.asarray(rows, dtype=float), ids


def cosine_texts(vectorizer, text_a, text_b):
    """TF-IDF cosine similarity between two event texts using a FITTED
    vectorizer. Returns 0.0 on empty either side (no shared signal)."""
    if not text_a or not text_b:
        return 0.0
    try:
        va = vectorizer.transform([text_a])
        vb = vectorizer.transform([text_b])
        # normalize each row, then dot — cosine without scipy
        na = np.sqrt(va.multiply(va).sum(axis=1))
        nb = np.sqrt(vb.multiply(vb).sum(axis=1))
        if na[0, 0] == 0 or nb[0, 0] == 0:
            return 0.0
        dot = (va.multiply(vb)).sum()
        return float(dot / (na[0, 0] * nb[0, 0]))
    except Exception:
        return 0.0
