import apiClient from "./client";

export interface Feedback {
  _id: string;
  event: string;
  attendee: { _id: string; name: string } | string;
  rating: number;
  comment: string;
  sentiment: "positive" | "neutral" | "negative";
  sentimentScore: number;
  createdAt: string;
}

export interface FeedbackSummary {
  count: number;
  avgRating: number;
  avgSentiment: number;
  breakdown: { positive: number; neutral: number; negative: number };
}

export const feedbackApi = {
  submit: async (
    eventId: string,
    data: { rating: number; comment?: string }
  ): Promise<{ feedback: Feedback }> => {
    const res = await apiClient.post(`/events/${eventId}/feedback`, data);
    return res.data;
  },

  getMine: async (eventId: string): Promise<{ feedback: Feedback | null }> => {
    const res = await apiClient.get(`/events/${eventId}/feedback/me`);
    return res.data;
  },

  getForEvent: async (
    eventId: string
  ): Promise<{ feedback: Feedback[]; summary: FeedbackSummary }> => {
    const res = await apiClient.get(`/events/${eventId}/feedback`);
    return res.data;
  },
};
