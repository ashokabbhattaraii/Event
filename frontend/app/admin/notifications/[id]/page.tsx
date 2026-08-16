"use client"

import { AppShell } from "@/components/app/app-shell"
import { NotificationDetail } from "@/components/app/notification-detail"
import { useCurrentUser } from "@/lib/queries/auth"

export default function AdminNotificationDetailPage() {
  const { data: userData } = useCurrentUser()
  const user = userData?.user

  return (
    <AppShell role="Administrator" userName={user?.name || "Admin"} title="Notification">
      <NotificationDetail basePath="/admin/notifications" />
    </AppShell>
  )
}