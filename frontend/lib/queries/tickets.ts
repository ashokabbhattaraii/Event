import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ticketsApi } from "../api/tickets";
import { useHasToken } from "../hooks/use-has-token";

export const ticketKeys = {
  mine: ["tickets", "mine"] as const,
};

export function useMyTickets() {
  return useQuery({
    queryKey: ticketKeys.mine,
    queryFn: ticketsApi.getMy,
    enabled: useHasToken(),
  });
}

export function useRegisterForEvent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (eventId: string) => ticketsApi.registerForEvent(eventId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ticketKeys.mine });
      queryClient.invalidateQueries({ queryKey: ["events"] });
    },
  });
}

export function useVerifyTicket() {
  return useMutation({
    mutationFn: (qrToken: string) => ticketsApi.verify(qrToken),
  });
}

export function useCancelTicket() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (ticketId: string) => ticketsApi.cancel(ticketId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ticketKeys.mine });
      queryClient.invalidateQueries({ queryKey: ["events"] });
    },
  });
}

// Organizer/admin: attendee roster for one managed event. Refetches after
// a check-in so the roster counts stay in sync with the Verify panel.
export function useEventAttendees(eventId?: string) {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: ["events", eventId, "attendees"] as const,
    queryFn: () => ticketsApi.getEventAttendees(eventId!),
    enabled: Boolean(eventId) && useHasToken(),
  });
  const refetch = () =>
    queryClient.invalidateQueries({ queryKey: ["events", eventId, "attendees"] as const });
  return { ...query, refetchAttendees: refetch };
}
