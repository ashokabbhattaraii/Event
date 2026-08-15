import apiClient from "./client";
import type { EventData } from "./events";

export interface TicketPayment {
  status: "none" | "pending" | "paid" | "refunded";
  amount: number;
  currency: string;
  stripeSessionId?: string;
  stripePaymentIntentId?: string;
}

export interface Ticket {
  _id: string;
  event: EventData | string;
  attendee: string;
  organization: string;
  qrToken: string;
  status: "valid" | "checked-in" | "cancelled";
  checkedInAt?: string;
  cancelledAt?: string;
  payment: TicketPayment;
  createdAt: string;
}

// Attendee roster entry — attendee is populated with name/email, ticket
// payment + check-in status so organizers can drill into a registration.
export interface EventAttendee {
  ticketId: string;
  status: "valid" | "checked-in" | "cancelled";
  registeredAt: string;
  checkedInAt?: string;
  cancelledAt?: string;
  payment: {
    status: "none" | "pending" | "paid" | "refunded";
    provider: string;
    amount: number;
    currency: string;
  };
  attendee: { _id: string; name: string; email: string };
}

export interface EventAttendeesResponse {
  event: {
    _id: string;
    title: string;
    date: string;
    capacity: number;
    registered: number;
  };
  attendees: EventAttendee[];
  counts: {
    total: number;
    checkedIn: number;
    valid: number;
    cancelled: number;
  };
}

export const ticketsApi = {
  registerForEvent: async (eventId: string): Promise<{ ticket: Ticket }> => {
    const res = await apiClient.post(`/events/${eventId}/register`);
    return res.data;
  },

  getMy: async (): Promise<{ tickets: Ticket[] }> => {
    const res = await apiClient.get("/tickets/my");
    return res.data;
  },

  cancel: async (ticketId: string): Promise<{ ticket: Ticket }> => {
    const res = await apiClient.post(`/tickets/${ticketId}/cancel`);
    return res.data;
  },

  verify: async (qrToken: string): Promise<{ ticket: Ticket }> => {
    const res = await apiClient.post("/tickets/verify", { qrToken });
    return res.data;
  },

  getEventAttendees: async (eventId: string): Promise<EventAttendeesResponse> => {
    const res = await apiClient.get(`/events/${eventId}/attendees`);
    return res.data;
  },
};
