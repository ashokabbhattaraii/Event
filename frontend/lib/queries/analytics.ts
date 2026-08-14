import { useQuery } from "@tanstack/react-query";
import { analyticsApi } from "../api/analytics";
import { useHasToken } from "../hooks/use-has-token";

export function useOrganizerAnalytics() {
  return useQuery({
    queryKey: ["analytics", "organizer"],
    queryFn: analyticsApi.organizer,
    enabled: useHasToken(),
  });
}

export function useAdminAnalytics() {
  return useQuery({
    queryKey: ["analytics", "admin"],
    queryFn: analyticsApi.admin,
    enabled: useHasToken(),
  });
}

export function useAudienceSegments() {
  return useQuery({
    queryKey: ["analytics", "segments"],
    queryFn: analyticsApi.segments,
    enabled: useHasToken(),
  });
}

export function useMarketingInsight() {
  return useQuery({
    queryKey: ["analytics", "marketing-insight"],
    queryFn: analyticsApi.marketingInsight,
    enabled: useHasToken(),
  });
}
