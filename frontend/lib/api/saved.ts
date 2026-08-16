import apiClient from "./client";
import type { EventData } from "./events";

// Server-side saved events (bookmark list). The heart on event cards and
// the /saved-events page use these for signed-in users, with the
// localStorage list as the guest fallback.

export interface SavedEventResponse {
  savedEvents: EventData[];
}

export const savedApi = {
  list: async (): Promise<SavedEventResponse> => {
    const res = await apiClient.get("/users/me/saved-events");
    return res.data;
  },
  add: async (eventId: string): Promise<{ saved: boolean; savedCount: number }> => {
    const res = await apiClient.post(`/users/me/saved-events/${eventId}`);
    return res.data;
  },
  remove: async (eventId: string): Promise<{ saved: boolean; savedCount: number }> => {
    const res = await apiClient.delete(`/users/me/saved-events/${eventId}`);
    return res.data;
  },
};