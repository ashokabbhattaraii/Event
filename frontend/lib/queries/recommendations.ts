import { useQuery } from "@tanstack/react-query";
import { recommendationsApi } from "../api/recommendations";

export const recommendationKeys = {
  list: ["recommendations", "list"] as const,
};

export function useRecommendations() {
  return useQuery({
    queryKey: recommendationKeys.list,
    queryFn: recommendationsApi.list,
    enabled: typeof window !== "undefined" && !!localStorage.getItem("token"),
  });
}
