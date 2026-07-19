import { AppShell } from "@/components/app/app-shell"
import { Reveal } from "@/components/anim/reveal"
import { NotificationList } from "@/components/app/notification-list"

export default function OrganizerNotificationsPage() {
  return (
    <AppShell role="Organizer" userName="Organizer" title="Notifications">
      <div className="space-y-8">
        <Reveal className="flex flex-col gap-1">
          <h1 className="font-display text-2xl font-bold tracking-tight text-ink">Organizer Notifications</h1>
          <p className="text-sm text-muted-foreground">New registrations and updates for events you organize.</p>
        </Reveal>
        <NotificationList />
      </div>
    </AppShell>
  )
}
