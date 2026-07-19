"use client"

import { Bell, CalendarCheck2, Info, Loader2, Sparkles } from "lucide-react"
import { Reveal } from "@/components/anim/reveal"
import { useMarkAllNotificationsRead, useMarkNotificationRead, useNotifications } from "@/lib/queries/notifications"
import type { Notification } from "@/lib/api/notifications"

const iconForType: Record<Notification["type"], typeof Bell> = {
  registration: CalendarCheck2,
  reminder: Bell,
  "event-update": Info,
  system: Sparkles,
}

const toneForType: Record<Notification["type"], string> = {
  registration: "text-primary bg-primary/12",
  reminder: "text-flame bg-flame/12",
  "event-update": "text-secondary bg-secondary/15",
  system: "text-primary bg-primary/12",
}

export function NotificationList() {
  const { data, isLoading } = useNotifications()
  const markRead = useMarkNotificationRead()
  const markAllRead = useMarkAllNotificationsRead()
  const notifications = data?.notifications ?? []
  const unreadCount = notifications.filter((n) => !n.read).length

  return (
    <div className="space-y-6">
      {unreadCount > 0 && (
        <div className="flex justify-end">
          <button
            onClick={() => markAllRead.mutate()}
            className="text-sm font-medium text-primary hover:underline"
          >
            Mark all {unreadCount} as read
          </button>
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" /> Loading notifications...
        </div>
      ) : (
        <Reveal stagger={0.08} y={24} className="grid gap-5 lg:grid-cols-3">
          {notifications.map((notice) => {
            const Icon = iconForType[notice.type]
            return (
              <button
                key={notice._id}
                onClick={() => !notice.read && markRead.mutate(notice._id)}
                className={`text-left rounded-2xl border p-6 shadow-[0_2px_24px_rgba(0,0,0,0.04)] transition-colors ${
                  notice.read ? "border-border bg-card" : "border-primary/30 bg-primary/[0.03]"
                }`}
              >
                <span className={`flex size-10 items-center justify-center rounded-xl ${toneForType[notice.type]}`}>
                  <Icon className="size-5" />
                </span>
                <h2 className="font-display mt-4 text-base font-semibold text-ink">{notice.title}</h2>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{notice.message}</p>
                <p className="mt-3 text-xs text-muted-foreground">
                  {new Date(notice.createdAt).toLocaleString()}
                </p>
              </button>
            )
          })}
        </Reveal>
      )}

      {!isLoading && notifications.length === 0 && (
        <div className="rounded-2xl border border-dashed border-border bg-card py-16 text-center">
          <p className="text-sm text-muted-foreground">No notifications yet.</p>
        </div>
      )}
    </div>
  )
}
