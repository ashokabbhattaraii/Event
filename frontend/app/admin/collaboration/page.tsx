"use client"

import { AppShell } from "@/components/app/app-shell"
import { CollaborationWorkspace } from "@/components/app/collaboration-workspace"
import { useCurrentUser } from "@/lib/queries/auth"

// Org Admin's collaboration console — same workspace as the Organizer one,
// mounted under /admin/* so the shell stays on the Org Admin nav/badge
// instead of flipping to Organizer branding (see orgAdminNav in
// nav-configs.ts and the isOrgScopedAdmin branch in AppShell).
export default function AdminCollaborationPage() {
  const { data: userData } = useCurrentUser()
  const user = userData?.user

  return (
    <AppShell role="Administrator" userName={user?.name || "Admin"} title="Collaboration">
      <CollaborationWorkspace />
    </AppShell>
  )
}
