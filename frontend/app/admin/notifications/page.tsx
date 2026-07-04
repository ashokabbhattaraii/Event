import { Bell, CheckCircle2, ShieldAlert, Sparkles } from "lucide-react"
import { AppShell } from "@/components/app/app-shell"
import { Reveal } from "@/components/anim/reveal"
import { activityFeed } from "@/lib/data"

const notices = [
  { title: "Security review pending", body: "Northwind tenant requires identity verification before activation.", tone: "text-flame bg-flame/12", icon: ShieldAlert },
  { title: "Weekly digest ready", body: "Analytics digest for executive stakeholders is available for export.", tone: "text-primary bg-primary/12", icon: Bell },
  { title: "Automation completed", body: "EventBot resolved 38 attendee issues without escalation this afternoon.", tone: "text-secondary bg-secondary/15", icon: Sparkles },
]

export default function AdminNotificationsPage() {
  return (
    <AppShell role="Administrator" userName="Jordan Reyes" title="Notifications">
      <div className="space-y-8">
        <Reveal className="flex flex-col gap-1">
          <h1 className="font-display text-2xl font-bold tracking-tight text-ink">Platform Notifications</h1>
          <p className="text-sm text-muted-foreground">Monitor high-priority alerts, digest items, and workflow completions.</p>
        </Reveal>

        <Reveal stagger={0.08} y={24} className="grid gap-4 lg:grid-cols-3">
          {notices.map((notice) => (
            <div key={notice.title} className="rounded-2xl border border-border bg-card p-5 shadow-[0_2px_24px_rgba(0,0,0,0.04)]">
              <span className={`flex size-10 items-center justify-center rounded-xl ${notice.tone}`}>
                <notice.icon className="size-5" />
              </span>
              <h2 className="font-display mt-4 text-base font-semibold text-ink">{notice.title}</h2>
              <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{notice.body}</p>
            </div>
          ))}
        </Reveal>

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