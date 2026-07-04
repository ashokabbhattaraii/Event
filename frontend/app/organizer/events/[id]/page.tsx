"use client"

import { use } from "react"
import { CalendarDays } from "lucide-react"
import { RoleEventDetail } from "@/components/app/role-event-detail"

export default function OrganizerEventDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)

  return (
    <RoleEventDetail
      eventId={id}
      role="Organizer"
      userName="Marcus Reid"
      title="Event Workspace"
      backHref="/organizer/events"
      backLabel="Back to my events"
      ticketHref="/organizer/tickets"
      registerLabel="Open workspace"
      registerIcon={CalendarDays}
    />
  )
}