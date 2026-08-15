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
