import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { feedbackApi } from "../api/feedback";

const enabled = typeof window !== "undefined" && !!localStorage.getItem("token");

export function useMyFeedback(eventId: string) {
  return useQuery({
    queryKey: ["feedback", "mine", eventId],
    queryFn: () => feedbackApi.getMine(eventId),
    enabled: enabled && !!eventId,
  });
}

export function useEventFeedback(eventId: string) {
  return useQuery({
    queryKey: ["feedback", "event", eventId],
    queryFn: () => feedbackApi.getForEvent(eventId),
    enabled: enabled && !!eventId,
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
