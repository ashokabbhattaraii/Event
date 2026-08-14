// Single source of truth for the event creation wizard's dropdowns. The
// backend's `type` field is schema-enforced (see backend/src/models/Event.js);
// `category` is free text server-side, but we constrain it in the UI so the
// public browse/filter experience stays coherent.
export const EVENT_TYPES = ["In-person", "Hybrid", "Virtual"] as const;

export const EVENT_CATEGORIES = [
  "Technology",
  "Business",
  "Academic",
  "Workshop",
  "Social",
  "Health",
  "Arts",
  "Music",
  "Sports",
  "Networking",
] as const;

export const EVENT_STATUSES = ["Draft", "Upcoming", "Live"] as const;

export const SUGGESTED_TAGS = [
  "Beginner friendly",
  "Free food",
  "Networking",
  "Certificate",
  "Hands-on",
  "Remote friendly",
  "Family friendly",
  "18+",
] as const;

export type EventType = (typeof EVENT_TYPES)[number];
export type EventStatus = (typeof EVENT_STATUSES)[number];
