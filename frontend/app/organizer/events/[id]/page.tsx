"use client"

import { use } from "react"
import { notFound } from "next/navigation"
import { CalendarDays } from "lucide-react"
import { RoleEventDetail } from "@/components/app/role-event-detail"
import { useCurrentUser } from "@/lib/queries/auth"

export default function OrganizerEventDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const { data: userData } = useCurrentUser()
  const user = userData?.user

  // Only organizers and admins can access this page
  if (!user || (user.role !== "organizer" && user.role !== "admin")) {
    notFound()
  }

  // Use actual user role from server
  const role = user.role === "admin" ? "Administrator" : "Organizer"

  return (
    <RoleEventDetail
      eventId={id}
      role={role}
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
