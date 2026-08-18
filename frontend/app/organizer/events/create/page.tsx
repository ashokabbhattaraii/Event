"use client"

import { useRouter } from "next/navigation"
import { AppShell } from "@/components/app/app-shell"
import { EventWizard } from "@/components/app/event-wizard"
import { useCreateEvent } from "@/lib/queries/events"
import { useCurrentUser } from "@/lib/queries/auth"

export default function CreateEventPage() {
  const router = useRouter()
  const { data: userData } = useCurrentUser()
  const createEvent = useCreateEvent()
  const user = userData?.user

  return (
    <AppShell role="Organizer" userName={user?.name || "Organizer"} title="Create Event">
      <EventWizard
        mode="create"
        isPending={createEvent.isPending}
        submitError={
          createEvent.isError
            ? (createEvent.error as any)?.response?.data?.message || "Failed to create event."
            : ""
        }
        onSubmit={(payload) =>
          createEvent.mutate(payload, { onSuccess: () => router.push("/organizer/events") })
        }
      />
    </AppShell>
  )
}
