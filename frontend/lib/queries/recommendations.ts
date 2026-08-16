import { keepPreviousData, useQuery } from "@tanstack/react-query";
import {
  recommendationsApi,
  type RecommendationListParams,
} from "../api/recommendations";
import { useHasToken } from "../hooks/use-has-token";

export const recommendationKeys = {
  list: ["recommendations", "list"] as const,
  listParams: (params: RecommendationListParams) => ["recommendations", "list", params] as const,
};

export function useRecommendations(params: RecommendationListParams = {}) {
  return useQuery({
    queryKey: recommendationKeys.listParams(params),
    queryFn: () => recommendationsApi.list(params),
    enabled: useHasToken(),
    placeholderData: keepPreviousData,
  });
}
