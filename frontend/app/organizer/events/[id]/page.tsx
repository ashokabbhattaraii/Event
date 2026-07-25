"use client"

import { use } from "react"
import { CalendarDays } from "lucide-react"
import { RoleEventDetail } from "@/components/app/role-event-detail"
import { useCurrentUser } from "@/lib/queries/auth"

export default function OrganizerEventDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const { data: userData } = useCurrentUser()
  const user = userData?.user

  return (
    <RoleEventDetail
      eventId={id}
      role="Organizer"
      userName={user?.name || "Organizer"}
      title="Event Workspace"
      backHref="/organizer/events"
      backLabel="Back to my events"
      ticketHref="/organizer/tickets"
      registerLabel="Open workspace"
      registerIcon={CalendarDays}
    />
  )
}
