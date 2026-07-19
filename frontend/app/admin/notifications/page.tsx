import { CheckCircle2 } from "lucide-react"
import { AppShell } from "@/components/app/app-shell"
import { Reveal } from "@/components/anim/reveal"
import { NotificationList } from "@/components/app/notification-list"
import { activityFeed } from "@/lib/data"

export default function AdminNotificationsPage() {
  return (
    <AppShell role="Administrator" userName="Admin" title="Notifications">
      <div className="space-y-8">
        <Reveal className="flex flex-col gap-1">
          <h1 className="font-display text-2xl font-bold tracking-tight text-ink">Platform Notifications</h1>
          <p className="text-sm text-muted-foreground">Monitor alerts and events for your organization.</p>
        </Reveal>

        <NotificationList />

        <Reveal className="rounded-2xl border border-border bg-card p-6 shadow-[0_2px_24px_rgba(0,0,0,0.04)]">
          <h2 className="font-display text-lg font-semibold text-ink">Recent Activity Feed</h2>
          <ul className="mt-5 space-y-4">
            {activityFeed.map((item, index) => (
              <li key={index} className="flex items-start gap-3 rounded-xl border border-border bg-background p-4">
                <span className={`mt-1 size-2.5 shrink-0 rounded-full ${item.color}`} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm leading-snug text-ink">
                    <span className="font-medium">{item.who}</span> {item.action}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">{item.time}</p>
                </div>
                <CheckCircle2 className="size-4 text-secondary" />
              </li>
            ))}
          </ul>
        </Reveal>
      </div>
    </AppShell>
  )
}
