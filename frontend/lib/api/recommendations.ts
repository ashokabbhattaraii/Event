import apiClient from "./client";
import type { EventData } from "./events";

export interface Recommendation {
  event: EventData;
  score: number;
  distanceKm: number | null;
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
