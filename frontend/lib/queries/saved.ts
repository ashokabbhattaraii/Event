import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { savedApi } from "../api/saved";
import { useHasToken } from "../hooks/use-has-token";

export const savedKeys = {
  list: ["savedEvents"] as const,
};

// Server-side saved events for the signed-in user. Enabled only when a
// session token exists (fires after the hydration-safe token flip), so
// guests never get a 401 — they keep the localStorage fallback instead.
export function useSavedEvents() {
  return useQuery({
    queryKey: savedKeys.list,
    queryFn: () => savedApi.list(),
    enabled: useHasToken(),
  });
}

export function useAddSavedEvent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (eventId: string) => savedApi.add(eventId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: savedKeys.list });
    },
  });
}

export function useRemoveSavedEvent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (eventId: string) => savedApi.remove(eventId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: savedKeys.list });
    },
  });
}