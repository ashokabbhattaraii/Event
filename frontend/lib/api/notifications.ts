import apiClient from "./client";
import { toQueryString, type ListParams, type Pagination } from "./list";

export type NotificationType =
  | "registration"
  | "reminder"
  | "event-update"
  | "system"
  | "nearby-event"
  | "check-in"
  // Cross-organization co-hosting: invitations, responses, AI matches.
  | "collaboration";

export interface Notification {
  _id: string;
  type: NotificationType;
  title: string;
  message: string;
  event?: { _id: string; title: string; date: string } | null;
  // Client-side deep-link target ("/my-tickets", "/organizer/tickets", ...)
  link?: string | null;
  // Free-form metadata attached at creation (ticketId, provider ref, ...)
  data?: Record<string, unknown> | null;
  read: boolean;
  createdAt: string;
}

export interface NotificationListParams extends ListParams {
  type?: string;
  read?: string;
}

/** Payload pushed over the Socket.IO channel when a notification is created. */
export interface RealtimeNotificationPush {
  notification: Notification;
  unread: number;
}

export const notificationsApi = {
  list: async (
    params: NotificationListParams = {}
  ): Promise<{ notifications: Notification[]; pagination: Pagination }> => {
    const res = await apiClient.get(`/notifications${toQueryString(params)}`);
    return res.data;
  },

  get: async (id: string): Promise<{ notification: Notification }> => {
    const res = await apiClient.get(`/notifications/${id}`);
    return res.data;
  },

  unreadCount: async (): Promise<{ count: number }> => {
    const res = await apiClient.get("/notifications/unread-count");
    return res.data;
  },

  markRead: async (id: string): Promise<{ notification: Notification }> => {
    const res = await apiClient.put(`/notifications/${id}/read`);
    return res.data;
  },

  markAllRead: async (): Promise<{ message: string }> => {
    const res = await apiClient.put("/notifications/read-all");
    return res.data;
  },
};