import apiClient from "./client";

export interface NetworkingSuggestion {
  attendeeId: string;
  name: string;
  sharedInterests: string[];
  matchScore: number;
}

export const networkingApi = {
  getForEvent: async (eventId: string): Promise<{ suggestions: NetworkingSuggestion[] }> => {
    const res = await apiClient.get(`/events/${eventId}/networking`);
    return res.data;
  },
};
