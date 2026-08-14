import { useQuery } from "@tanstack/react-query";
import { networkingApi } from "../api/networking";

const enabled = typeof window !== "undefined" && !!localStorage.getItem("token");

export function useEventNetworking(eventId: string, isRegistered: boolean) {
  return useQuery({
    queryKey: ["networking", eventId],
    queryFn: () => networkingApi.getForEvent(eventId),
    enabled: enabled && !!eventId && isRegistered,
    retry: false,
  });
}
