"use client"

import { AppShell } from "@/components/app/app-shell"
import { CollaborationWorkspace } from "@/components/app/collaboration-workspace"
import { useCurrentUser } from "@/lib/queries/auth"

export default function OrganizerCollaborationPage() {
  const { data: userData } = useCurrentUser()
  const user = userData?.user

  return (
    <AppShell role="Organizer" userName={user?.name || "Organizer"} title="Collaboration">
      <CollaborationWorkspace />
    </AppShell>
  )
}
