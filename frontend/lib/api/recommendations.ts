import apiClient from "./client";
import { toQueryString, type ListParams, type Pagination } from "./list";
import type { EventData } from "./events";

export interface Recommendation {
  event: EventData;
  score: number;
  distanceKm: number | null;
  // One-line "why this pick" — AI-phrased from the scorer's own factors
  // (fallback: deterministic sentence derived from the same factors).
  reason?: string;
}

export interface RecommendationListParams extends ListParams {
  category?: string;
}

export interface RecommendationsResponse {
  recommendations: Recommendation[];
  hasLocation: boolean;
  pagination: Pagination;
}

export const recommendationsApi = {
  list: async (params: RecommendationListParams = {}): Promise<RecommendationsResponse> => {
    const res = await apiClient.get(`/recommendations${toQueryString(params)}`);
    return res.data;
  },
};
