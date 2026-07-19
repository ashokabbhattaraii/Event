import apiClient from "./client";

export interface Notification {
  _id: string;
  type: "registration" | "reminder" | "event-update" | "system";
  title: string;
  message: string;
  event?: { _id: string; title: string; date: string } | null;
  read: boolean;
  createdAt: string;
}

export const notificationsApi = {
  list: async (): Promise<{ notifications: Notification[] }> => {
    const res = await apiClient.get("/notifications");
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
