import { useEffect } from "react";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  notificationsApi,
  type Notification,
  type NotificationListParams,
  type RealtimeNotificationPush,
} from "../api/notifications";
import { useHasToken } from "../hooks/use-has-token";
import { disconnectSocket, getSocket } from "../socket";

export const notificationKeys = {
  list: ["notifications", "list"] as const,
  listParams: (params: NotificationListParams) => ["notifications", "list", params] as const,
  detail: (id: string) => ["notifications", "detail", id] as const,
  unreadCount: ["notifications", "unread"] as const,
};

export function useNotifications(params: NotificationListParams = {}) {
  return useQuery({
    queryKey: notificationKeys.listParams(params),
    queryFn: () => notificationsApi.list(params),
    enabled: useHasToken(),
    placeholderData: keepPreviousData,
  });
}

// Live unread badge count. Refreshed by the Socket.IO channel (see
// useRealtimeNotifications); the interval is only a fallback for when the
// socket is down or the browser never established a connection.
export function useUnreadCount() {
  return useQuery({
    queryKey: notificationKeys.unreadCount,
    queryFn: notificationsApi.unreadCount,
    enabled: useHasToken(),
    refetchInterval: 60_000,
    select: (data) => data.count,
  });
}

export function useNotification(id: string | undefined) {
  return useQuery({
    queryKey: notificationKeys.detail(id ?? ""),
    queryFn: () => notificationsApi.get(id!),
    enabled: useHasToken() && !!id,
  });
}

export function useMarkNotificationRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => notificationsApi.markRead(id),
    onSuccess: ({ notification }) => {
      queryClient.invalidateQueries({ queryKey: notificationKeys.list });
      queryClient.setQueryData(notificationKeys.detail(notification._id), { notification });
      queryClient.invalidateQueries({ queryKey: notificationKeys.unreadCount });
    },
  });
}

export function useMarkAllNotificationsRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => notificationsApi.markAllRead(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: notificationKeys.list });
      queryClient.setQueryData(notificationKeys.unreadCount, { count: 0 });
    },
  });
}

// Role → notifications section base path for deep links and detail pages.
export function notificationsSectionForRole(role?: string | null): string {
  if (role === "admin") return "/admin/notifications";
  if (role === "organizer") return "/organizer/notifications";
  return "/notifications";
}

/**
 * Pulls the Socket.IO channel and keeps every notification query in sync:
 *
 *  - "notification:created"  → toast + invalidate list + refresh unread badge
 *  - "notification:read"     → flip the cached doc / list entry, badge update
 *  - "notifications:read-all" → clear badge, invalidate list
 *  - "unread:count"          → set the badge directly (no round trip needed)
 *
 * Mounted once in the root layout (see app/layout.tsx) so the whole app —
 * including public pages — receives pushes for the signed-in user. No-op
 * when there's no session token.
 */
export function useRealtimeNotifications() {
  const hasToken = useHasToken();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!hasToken) {
      disconnectSocket();
      return;
    }

    const socket = getSocket();
    if (!socket) return;

    const onCreated = ({ notification, unread }: RealtimeNotificationPush) => {
      queryClient.setQueryData(notificationKeys.unreadCount, { count: unread });
      queryClient.invalidateQueries({ queryKey: notificationKeys.list });
      queryClient.invalidateQueries({ queryKey: notificationKeys.unreadCount });

      const section = notificationsSectionForRole(
        (typeof window !== "undefined" && JSON.parse(localStorage.getItem("user") || "{}")?.role) || null
      );
      toast(notification.title, {
        description: notification.message,
        action: {
          label: "View",
          onClick: () => {
            window.location.href = `${section}/${notification._id}`;
          },
        },
      });
    };

    const onRead = ({ id, unread }: { id: string; unread: number }) => {
      queryClient.setQueryData(notificationKeys.unreadCount, { count: unread });
      // Flip the cached single-notification doc if present.
      queryClient.setQueryData<{ notification: Notification }>(notificationKeys.detail(id), (old) =>
        old ? { notification: { ...old.notification, read: true } } : old
      );
      // Flip in-place inside any cached list payloads (fast path — avoids a
      // refetch flicker across open tabs).
      queryClient.setQueriesData<{ notifications: Notification[] }>(
        { queryKey: notificationKeys.list, exact: false },
        (old) =>
          old
            ? { ...old, notifications: old.notifications.map((n) => (n._id === id ? { ...n, read: true } : n)) }
            : old
      );
    };

    const onReadAll = ({ unread }: { unread: number }) => {
      queryClient.setQueryData(notificationKeys.unreadCount, { count: unread });
      queryClient.setQueriesData<{ notifications: Notification[] }>(
        { queryKey: notificationKeys.list, exact: false },
        (old) =>
          old
            ? { ...old, notifications: old.notifications.map((n) => ({ ...n, read: true })) }
            : old
      );
    };

    const onUnread = ({ count }: { count: number }) => {
      queryClient.setQueryData(notificationKeys.unreadCount, { count });
    };

    socket.on("notification:created", onCreated);
    socket.on("notification:read", onRead);
    socket.on("notifications:read-all", onReadAll);
    socket.on("unread:count", onUnread);

    return () => {
      socket.off("notification:created", onCreated);
      socket.off("notification:read", onRead);
      socket.off("notifications:read-all", onReadAll);
      socket.off("unread:count", onUnread);
    };
  }, [hasToken, queryClient]);
}