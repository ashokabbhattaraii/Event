"use client"

import { use } from "react"
import { RoleEventDetail } from "@/components/app/role-event-detail"

export default function EventDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)

  return (
    <RoleEventDetail
      eventId={id}
      role="Attendee"
      userName="Ava Lindqvist"
      title="Event Details"
      backHref="/attendee"
      backLabel="Back to discover"
      ticketHref="/attendee/tickets"
      registerLabel="Register now"
    />
  )
}
