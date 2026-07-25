import apiClient from "./client";

export interface UserLocation {
  lat: number;
  lng: number;
  city?: string;
  updatedAt?: string;
}

export const locationApi = {
  update: async (loc: {
    lat: number;
    lng: number;
    city?: string;
  }): Promise<{ location: UserLocation }> => {
    const res = await apiClient.patch("/users/me/location", loc);
    return res.data;
  },
};

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
