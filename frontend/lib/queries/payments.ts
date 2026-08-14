import { useMutation, useQuery } from "@tanstack/react-query";
import { paymentsApi } from "../api/payments";

const enabled = typeof window !== "undefined" && !!localStorage.getItem("token");

export function usePaymentConfig() {
  return useQuery({
    queryKey: ["payments", "config"],
    queryFn: paymentsApi.config,
    staleTime: 5 * 60 * 1000,
  });
}

export function useCreateCheckoutSession() {
  return useMutation({
    mutationFn: (eventId: string) => paymentsApi.createCheckoutSession(eventId),
  });
}

export function useCheckoutStatus(sessionId: string | null) {
  return useQuery({
    queryKey: ["payments", "checkout-status", sessionId],
    queryFn: () => paymentsApi.checkoutStatus(sessionId as string),
    enabled: enabled && !!sessionId,
    retry: 3,
    retryDelay: 1500,
  });
}
