"use client"

import { AppShell } from "@/components/app/app-shell"
import { Reveal } from "@/components/anim/reveal"
import { NotificationList } from "@/components/app/notification-list"
import { useCurrentUser } from "@/lib/queries/auth"
import { useNotifications } from "@/lib/queries/notifications"
import { Bell, Loader2 } from "lucide-react"

export default function AdminNotificationsPage() {
  const { data: userData } = useCurrentUser()
  const { data: notifData, isLoading } = useNotifications()
  const user = userData?.user
  const notifications = notifData?.notifications ?? []

  return (
    <AppShell role="Administrator" userName={user?.name || "Admin"} title="Notifications">
      <div className="space-y-8">
        <Reveal className="flex flex-col gap-1">
          <h1 className="font-display text-2xl font-bold tracking-tight text-ink">Platform Notifications</h1>
          <p className="text-sm text-muted-foreground">Monitor alerts and events for your organization.</p>
        </Reveal>

        <NotificationList />

        <Reveal className="rounded-2xl border border-border bg-card p-6">
          <h2 className="font-display text-lg font-semibold text-ink">Notification History</h2>
          <div className="mt-5 space-y-4">
            {isLoading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="size-4 animate-spin" /> Loading...
              </div>
            ) : notifications.length === 0 ? (
              <p className="text-sm text-muted-foreground">No notifications yet.</p>
            ) : (
              notifications.slice(0, 10).map((n) => (
                <div key={n._id} className="flex items-start gap-3 rounded-xl border border-border bg-background p-4">
                  <span className="flex size-8 items-center justify-center rounded-lg bg-primary/10">
                    <Bell className="size-4 text-primary" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm leading-snug text-ink">
                      <span className="font-medium">{n.title}</span>
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">{n.message}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {new Date(n.createdAt).toLocaleString()}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </Reveal>
      </div>
    </AppShell>
  )
}
