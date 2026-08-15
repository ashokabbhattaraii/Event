"use client"

import { use } from "react"
import { RoleEventDetail } from "@/components/app/role-event-detail"
import { useCurrentUser } from "@/lib/queries/auth"

export default function EventDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const { data: userData } = useCurrentUser()
  const user = userData?.user
  const displayName = user?.name || "Attendee"

  return (
    <RoleEventDetail
      eventId={id}
      role="Attendee"
      userName={displayName}
      title="Event Details"
      backHref="/dashboard"
      backLabel="Back to discover"
      ticketHref="/my-tickets"
      registerLabel="Register now"
    />
  )
}
