import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { notificationsApi } from "../api/notifications";

export const notificationKeys = {
  list: ["notifications", "list"] as const,
};

const enabled = typeof window !== "undefined" && !!localStorage.getItem("token");

export function useNotifications() {
  return useQuery({
    queryKey: notificationKeys.list,
    queryFn: notificationsApi.list,
    enabled,
  });
}

export function useMarkNotificationRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => notificationsApi.markRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: notificationKeys.list });
    },
  });
}

export function useMarkAllNotificationsRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => notificationsApi.markAllRead(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: notificationKeys.list });
    },
  });
}
