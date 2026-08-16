import apiClient from "./client";
import { toQueryString, type ListParams, type Pagination } from "./list";

export interface Notification {
  _id: string;
  type: "registration" | "reminder" | "event-update" | "system" | "nearby-event";
  title: string;
  message: string;
  event?: { _id: string; title: string; date: string } | null;
  read: boolean;
  createdAt: string;
}

export interface NotificationListParams extends ListParams {
  type?: string;
  read?: string;
}

export const notificationsApi = {
  list: async (
    params: NotificationListParams = {}
  ): Promise<{ notifications: Notification[]; pagination: Pagination }> => {
    const res = await apiClient.get(`/notifications${toQueryString(params)}`);
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
