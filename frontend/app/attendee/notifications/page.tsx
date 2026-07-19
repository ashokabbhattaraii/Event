import { AppShell } from "@/components/app/app-shell"
import { Reveal } from "@/components/anim/reveal"
import { NotificationList } from "@/components/app/notification-list"

export default function AttendeeNotificationsPage() {
  return (
    <AppShell role="Attendee" userName="Attendee" title="Notifications">
      <div className="space-y-8">
        <Reveal className="flex flex-col gap-1">
          <h1 className="font-display text-2xl font-bold tracking-tight text-ink">Notifications</h1>
          <p className="text-sm text-muted-foreground">Stay updated on event changes, reminders, and registrations.</p>
        </Reveal>
        <NotificationList />
      </div>
    </AppShell>
  )
}
