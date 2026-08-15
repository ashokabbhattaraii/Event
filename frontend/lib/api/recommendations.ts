import apiClient from "./client";
import type { EventData } from "./events";

export interface Recommendation {
  event: EventData;
  score: number;
  distanceKm: number | null;
  // One-line "why this pick" — AI-phrased from the scorer's own factors
  // (fallback: deterministic sentence derived from the same factors).
  reason?: string;
}

export interface RecommendationsResponse {
  recommendations: Recommendation[];
  hasLocation: boolean;
}

export const recommendationsApi = {
  list: async (): Promise<RecommendationsResponse> => {
    const res = await apiClient.get("/recommendations");
    return res.data;
  },
};
