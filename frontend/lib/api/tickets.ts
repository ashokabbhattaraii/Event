import apiClient from "./client";
import type { EventData } from "./events";

export interface Ticket {
  _id: string;
  event: EventData | string;
  attendee: string;
  organization: string;
  qrToken: string;
  status: "valid" | "checked-in" | "cancelled";
  checkedInAt?: string;
  createdAt: string;
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

  verify: async (qrToken: string): Promise<{ ticket: Ticket }> => {
    const res = await apiClient.post("/tickets/verify", { qrToken });
    return res.data;
  },
};
