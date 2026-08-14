import { useQuery } from "@tanstack/react-query";
import { networkingApi } from "../api/networking";
import { useHasToken } from "../hooks/use-has-token";

export function useEventNetworking(eventId: string, isRegistered: boolean) {
  return useQuery({
    queryKey: ["networking", eventId],
    queryFn: () => networkingApi.getForEvent(eventId),
    enabled: useHasToken() && !!eventId && isRegistered,
    retry: false,
  });
}
