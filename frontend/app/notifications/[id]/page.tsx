"use client"

import { AppShell } from "@/components/app/app-shell"
import { NotificationDetail } from "@/components/app/notification-detail"
import { useCurrentUser } from "@/lib/queries/auth"

export default function AttendeeNotificationDetailPage() {
  const { data: userData } = useCurrentUser()
  const user = userData?.user

  return (
    <AppShell role="Attendee" userName={user?.name || "Attendee"} title="Notification">
      <NotificationDetail basePath="/notifications" />
    </AppShell>
  )
}