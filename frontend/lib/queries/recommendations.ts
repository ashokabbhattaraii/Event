import { useQuery } from "@tanstack/react-query";
import { recommendationsApi } from "../api/recommendations";
import { useHasToken } from "../hooks/use-has-token";

export const recommendationKeys = {
  list: ["recommendations", "list"] as const,
};

export function useRecommendations() {
  return useQuery({
    queryKey: recommendationKeys.list,
    queryFn: recommendationsApi.list,
    enabled: useHasToken(),
  });
}
