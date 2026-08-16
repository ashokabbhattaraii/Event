"use client"

import { AppShell } from "@/components/app/app-shell"
import { NotificationDetail } from "@/components/app/notification-detail"
import { useCurrentUser } from "@/lib/queries/auth"

export default function OrganizerNotificationDetailPage() {
  const { data: userData } = useCurrentUser()
  const user = userData?.user

  return (
    <AppShell role="Organizer" userName={user?.name || "Organizer"} title="Notification">
      <NotificationDetail basePath="/organizer/notifications" />
    </AppShell>
  )
}