"use client"

import { use } from "react"
import { notFound } from "next/navigation"
import { RoleEventDetail } from "@/components/app/role-event-detail"
import { useCurrentUser } from "@/lib/queries/auth"

export default function EventDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const { data: userData } = useCurrentUser()
  const user = userData?.user
  const displayName = user?.name || "Attendee"

  // Use actual user role from server, not hardcoded
  const role =
    user?.role === "admin" || user?.role === "org_admin"
      ? "Administrator"
      : user?.role === "organizer"
        ? "Organizer"
        : "Attendee"

  return (
    <RoleEventDetail
      eventId={id}
      role={role}
      userName={user?.name || "Attendee"}
      title="Event Details"
      backHref="/dashboard"
      backLabel="Back to discover"
      ticketHref="/my-tickets"
      registerLabel="Register now"
    />
  )
}
