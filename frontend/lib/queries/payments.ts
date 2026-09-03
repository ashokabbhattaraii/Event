import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { paymentsApi } from "../api/payments";
import type { CheckoutStatus } from "../api/payments";
import { useHasToken } from "../hooks/use-has-token";
import { getErrorMessage } from "../errors";

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
    onError: (error: unknown) => toast.error(getErrorMessage(error, "Failed to create checkout session.")),
  });
}

export function useInitiateEsewaPayment() {
  return useMutation({
    mutationFn: (eventId: string) => paymentsApi.initiateEsewa(eventId),
    onError: (error: unknown) => toast.error(getErrorMessage(error, "Failed to start eSewa payment.")),
  });
}

export function useCheckoutStatus(sessionId: string | null) {
  return useQuery({
    queryKey: ["payments", "checkout-status", sessionId],
    queryFn: () => paymentsApi.checkoutStatus(sessionId as string),
    enabled: useHasToken() && !!sessionId,
    retry: 3,
    retryDelay: 1500,
    // A paid session with no ticket yet means the webhook is still
    // processing — keep polling every 2s instead of leaving the success
    // page claiming a ticket is ready that doesn't exist.
    refetchInterval: (query) => {
      const data = query.state.data as CheckoutStatus | undefined;
      return data?.paid && !data.ticket ? 2000 : false;
    },
  });
}
