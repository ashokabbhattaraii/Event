// Saved events live in localStorage (event ids). Shared by the event detail
// page's heart toggle and the /saved-events page so both stay in sync.

const STORAGE_KEY = "savedEventIds";

export function getSavedIds(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveIds(ids: string[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
}

export function isSaved(id: string): boolean {
  return getSavedIds().includes(id);
}

export function toggleSaved(id: string): boolean {
  const ids = getSavedIds();
  const next = ids.includes(id) ? ids.filter((sid) => sid !== id) : [...ids, id];
  saveIds(next);
  return next.includes(id);
}
