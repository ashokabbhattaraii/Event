import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ticketsApi, type AttendeeListParams } from "../api/tickets";
import type { ListParams } from "../api/list";
import { useHasToken } from "../hooks/use-has-token";
import { getErrorMessage } from "../errors";

export const ticketKeys = {
  mine: ["tickets", "mine"] as const,
  mineParams: (params: ListParams) => ["tickets", "mine", params] as const,
};

export function useMyTickets(params: ListParams = {}) {
  return useQuery({
    queryKey: ticketKeys.mineParams(params),
    queryFn: () => ticketsApi.getMy(params),
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
      toast.success("Registered! Your ticket and QR are ready.");
    },
    onError: (error: unknown) => toast.error(getErrorMessage(error, "Registration failed.")),
  });
}

export function useVerifyTicket() {
  return useMutation({
    mutationFn: (qrToken: string) => ticketsApi.verify(qrToken),
    onSuccess: () => toast.success("Ticket verified — checked in!"),
    onError: (error: unknown) => toast.error(getErrorMessage(error, "Verification failed. Invalid or already used ticket.")),
  });
}

export function useCancelTicket() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (ticketId: string) => ticketsApi.cancel(ticketId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ticketKeys.mine });
      queryClient.invalidateQueries({ queryKey: ["events"] });
      toast.success("Registration cancelled. Your spot is freed.");
    },
    onError: (error: unknown) => toast.error(getErrorMessage(error, "Couldn't cancel registration.")),
  });
}

// Organizer/admin: attendee roster for one managed event. Refetches after
// a check-in so the roster counts stay in sync with the Verify panel.
export function useEventAttendees(eventId?: string, params: AttendeeListParams = {}) {
  const queryClient = useQueryClient();
  const hasToken = useHasToken();
  const query = useQuery({
    queryKey: ["events", eventId, "attendees", params] as const,
    queryFn: () => ticketsApi.getEventAttendees(eventId!, params),
    enabled: Boolean(eventId) && hasToken,
  });
  const refetch = () =>
    queryClient.invalidateQueries({ queryKey: ["events", eventId, "attendees"] as const });
  return { ...query, refetchAttendees: refetch };
}
