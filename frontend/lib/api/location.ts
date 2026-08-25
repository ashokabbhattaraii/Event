import apiClient from "./client";

export interface UserLocation {
  lat: number;
  lng: number;
  city?: string;
  updatedAt?: string;
}

export const locationApi = {
  // Omitting lat/lng clears the saved location (the backend treats a
  // missing pair as "remove" — see userController.updateMyLocation).
  update: async (loc: {
    lat?: number;
    lng?: number;
    city?: string;
  }): Promise<{ location: UserLocation | null }> => {
    const res = await apiClient.patch("/users/me/location", loc);
    return res.data;
  },
};

/**
 * Current geolocation permission, WITHOUT triggering a prompt.
 *
 * This is what lets the app avoid asking a user who has already decided:
 * "granted" means we can read the position silently, "denied" means asking
 * again is pointless (the browser suppresses repeat prompts anyway), and only
 * "prompt" warrants showing our own explanation first.
 *
 * Returns "unsupported" where the Permissions API isn't available (older
 * Safari), so callers can fall back to asking rather than assuming.
 */
export async function getGeolocationPermission(): Promise<
  "granted" | "denied" | "prompt" | "unsupported"
> {
  if (typeof navigator === "undefined" || !navigator.geolocation) return "unsupported";
  if (!navigator.permissions?.query) return "unsupported";
  try {
    const status = await navigator.permissions.query({ name: "geolocation" as PermissionName });
    return status.state as "granted" | "denied" | "prompt";
  } catch {
    return "unsupported";
  }
}

/**
 * Ask the browser for the user's coordinates. Resolves to null (instead of
 * throwing) if geolocation is unsupported, denied, or times out — location is
 * always an enhancement, never a blocker for logging in.
 */
export function getBrowserLocation(): Promise<{ lat: number; lng: number } | null> {
  return new Promise((resolve) => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      resolve(null);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => resolve(null),
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 5 * 60 * 1000 }
    );
  });
}

/**
 * Capture the browser location and persist it to the backend. Fire-and-forget:
 * never rejects, so callers (e.g. login success) can call it without awaiting.
 */
export async function captureAndSaveLocation(): Promise<UserLocation | null> {
  try {
    const coords = await getBrowserLocation();
    if (!coords) return null;
    const { location } = await locationApi.update(coords);
    return location;
  } catch {
    return null;
  }
}
