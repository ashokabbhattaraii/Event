"use client"

import { AppShell } from "@/components/app/app-shell"
import { Reveal } from "@/components/anim/reveal"
import { NotificationList } from "@/components/app/notification-list"
import { useCurrentUser } from "@/lib/queries/auth"

export default function AdminNotificationsPage() {
  const { data: userData } = useCurrentUser()
  const user = userData?.user

  return (
    <AppShell role="Administrator" userName={user?.name || "Admin"} title="Notifications">
      <div className="space-y-8">
        <Reveal className="flex flex-col gap-1">
          <h1 className="font-display text-2xl font-bold tracking-tight text-ink">Platform Notifications</h1>
          <p className="text-sm text-muted-foreground">
            Monitor alerts and events for your organization — delivered in real time.
          </p>
        </Reveal>

        <NotificationList basePath="/admin/notifications" />
      </div>
    </AppShell>
  )
}