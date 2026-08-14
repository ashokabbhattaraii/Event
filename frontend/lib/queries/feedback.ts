import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { feedbackApi } from "../api/feedback";
import { useHasToken } from "../hooks/use-has-token";

export function useMyFeedback(eventId: string) {
  return useQuery({
    queryKey: ["feedback", "mine", eventId],
    queryFn: () => feedbackApi.getMine(eventId),
    enabled: useHasToken() && !!eventId,
  });
}

export function useEventFeedback(eventId: string) {
  return useQuery({
    queryKey: ["feedback", "event", eventId],
    queryFn: () => feedbackApi.getForEvent(eventId),
    enabled: useHasToken() && !!eventId,
  });
}

export function useSubmitFeedback(eventId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { rating: number; comment?: string }) => feedbackApi.submit(eventId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["feedback", "mine", eventId] });
      queryClient.invalidateQueries({ queryKey: ["feedback", "event", eventId] });
    },
  });
}
