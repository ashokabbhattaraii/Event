import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ticketsApi } from "../api/tickets";

export const ticketKeys = {
  mine: ["tickets", "mine"] as const,
};

export function useMyTickets() {
  return useQuery({
    queryKey: ticketKeys.mine,
    queryFn: ticketsApi.getMy,
    enabled: typeof window !== "undefined" && !!localStorage.getItem("token"),
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
