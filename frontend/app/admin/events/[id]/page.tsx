"use client"

import { use } from "react"
import { CalendarDays } from "lucide-react"
import { RoleEventDetail } from "@/components/app/role-event-detail"
import { useCurrentUser } from "@/lib/queries/auth"

export default function AdminEventDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const { data: userData } = useCurrentUser()
  const user = userData?.user

  return (
    <RoleEventDetail
      eventId={id}
      role={user?.role === "admin" ? "Administrator" : "Administrator"}
      userName={user?.name || "Admin"}
      title="Event Oversight"
      backHref="/admin/events"
      backLabel="Back to events"
      ticketHref="/admin/events"
      registerLabel="Review event"
      registerIcon={CalendarDays}
    />
  )
}
