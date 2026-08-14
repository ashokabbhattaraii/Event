import { useMutation, useQuery } from "@tanstack/react-query";
import { paymentsApi } from "../api/payments";
import { useHasToken } from "../hooks/use-has-token";

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

export function useInitiateEsewaPayment() {
  return useMutation({
    mutationFn: (eventId: string) => paymentsApi.initiateEsewa(eventId),
  });
}

export function useCheckoutStatus(sessionId: string | null) {
  return useQuery({
    queryKey: ["payments", "checkout-status", sessionId],
    queryFn: () => paymentsApi.checkoutStatus(sessionId as string),
    enabled: useHasToken() && !!sessionId,
    retry: 3,
    retryDelay: 1500,
  });
}
