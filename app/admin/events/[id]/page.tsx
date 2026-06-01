"use client"

import { use } from "react"
import { CalendarDays } from "lucide-react"
import { RoleEventDetail } from "@/components/app/role-event-detail"

export default function AdminEventDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)

  return (
    <RoleEventDetail
      eventId={id}
      role="Administrator"
      userName="Jordan Reyes"
      title="Event Oversight"
      backHref="/admin/events"
      backLabel="Back to events"
      ticketHref="/admin/events"
      registerLabel="Review event"
      registerIcon={CalendarDays}
    />
  )
}