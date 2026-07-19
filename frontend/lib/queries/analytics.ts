import { useQuery } from "@tanstack/react-query";
import { analyticsApi } from "../api/analytics";

const enabled = typeof window !== "undefined" && !!localStorage.getItem("token");

export function useOrganizerAnalytics() {
  return useQuery({
    queryKey: ["analytics", "organizer"],
    queryFn: analyticsApi.organizer,
    enabled,
  });
}

export function useAdminAnalytics() {
  return useQuery({
    queryKey: ["analytics", "admin"],
    queryFn: analyticsApi.admin,
    enabled,
  });
}
