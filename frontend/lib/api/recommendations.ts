import apiClient from "./client";
import type { EventData } from "./events";

export interface Recommendation {
  event: EventData;
  score: number;
}

export const recommendationsApi = {
  list: async (): Promise<{ recommendations: Recommendation[] }> => {
    const res = await apiClient.get("/recommendations");
    return res.data;
  },
};
