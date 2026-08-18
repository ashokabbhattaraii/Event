"use client"

import { use } from "react"
import { useRouter } from "next/navigation"
import { notFound } from "next/navigation"
import { ArrowLeft, Loader2 } from "lucide-react"
import Link from "next/link"
import { AppShell } from "@/components/app/app-shell"
import { EventWizard } from "@/components/app/event-wizard"
import { useEvent, useUpdateEvent } from "@/lib/queries/events"
import { useCurrentUser } from "@/lib/queries/auth"

export default function EditEventPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const { data: userData } = useCurrentUser()
  const { data: eventData, isLoading, isError } = useEvent(id)
  const updateEvent = useUpdateEvent()
  const user = userData?.user

  // Only organizers and admins can edit events
  if (!user || (user.role !== "organizer" && user.role !== "admin")) {
    notFound()
  }

  const role = user.role === "admin" ? "Administrator" : "Organizer"
  const event = eventData?.event

  if (isLoading) {
    return (
      <AppShell role={role} userName={user?.name || "Organizer"} title="Edit Event">
        <div className="flex items-center justify-center py-24">
          <Loader2 className="size-6 animate-spin text-primary" />
        </div>
      </AppShell>
    )
  }

  if (isError || !event) notFound()

  return (
    <AppShell role={role} userName={user?.name || "Organizer"} title="Edit Event">
      <div className="space-y-6">
        <Link
          href={`/organizer/events/${id}`}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-ink"
        >
          <ArrowLeft className="size-4" /> Back to event workspace
        </Link>
        <EventWizard
          mode="edit"
          initialData={event}
          isPending={updateEvent.isPending}
          submitLabel="Save Changes"
          submitError={
            updateEvent.isError
              ? (updateEvent.error as any)?.response?.data?.message || "Failed to save changes."
              : ""
          }
          onSubmit={(payload) =>
            updateEvent.mutate(
              { id, data: payload },
              { onSuccess: () => router.push(`/organizer/events/${id}`) }
            )
          }
        />
      </div>
    </AppShell>
  )
}
