"use client"

import { AppShell } from "@/components/app/app-shell"
import { Reveal } from "@/components/anim/reveal"
import { NotificationList } from "@/components/app/notification-list"
import { useCurrentUser } from "@/lib/queries/auth"

export default function AttendeeNotificationsPage() {
  const { data: userData } = useCurrentUser()
  const user = userData?.user

  return (
    <AppShell role="Attendee" userName={user?.name || "Attendee"} title="Notifications">
      <div className="space-y-8">
        <Reveal className="flex flex-col gap-1">
          <h1 className="font-display text-2xl font-bold tracking-tight text-ink">Notifications</h1>
          <p className="text-sm text-muted-foreground">Stay updated on event changes, reminders, and registrations.</p>
        </Reveal>
        <NotificationList basePath="/notifications" />
      </div>
    </AppShell>
  )
}
