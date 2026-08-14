import apiClient from "./client";
import type { Ticket } from "./tickets";

export interface PaymentConfig {
  enabled: boolean;
  publishableKey: string | null;
  esewaEnabled: boolean;
  nprUsdRate: number;
}

export interface CheckoutStatus {
  paid: boolean;
  ticket: Ticket | null;
}

export interface EsewaPaymentForm {
  action: string;
  fields: Record<string, string>;
}

export const paymentsApi = {
  config: async (): Promise<PaymentConfig> => {
    const res = await apiClient.get("/payments/config");
    return res.data;
  },

  createCheckoutSession: async (eventId: string): Promise<{ url: string; chargeAmount: number; chargeCurrency: string }> => {
    const res = await apiClient.post(`/payments/checkout/${eventId}`);
    return res.data;
  },

  checkoutStatus: async (sessionId: string): Promise<CheckoutStatus> => {
    const res = await apiClient.get(`/payments/checkout/status/${sessionId}`);
    return res.data;
  },

  initiateEsewa: async (eventId: string): Promise<EsewaPaymentForm> => {
    const res = await apiClient.post(`/payments/esewa/initiate/${eventId}`);
    return res.data;
  },
};
