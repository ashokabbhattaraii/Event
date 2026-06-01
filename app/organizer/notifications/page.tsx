import { Bell, MessageSquare, Sparkles } from "lucide-react"
import { AppShell } from "@/components/app/app-shell"
import { Reveal } from "@/components/anim/reveal"

const organizerNotices = [
  { title: "Collaboration request approved", body: "Velocity accepted the co-host request for DevSummit 2026.", icon: Bell, tone: "text-primary bg-primary/12" },
  { title: "AI suggestion ready", body: "EventBot recommends opening a waitlist tier before Friday.", icon: Sparkles, tone: "text-secondary bg-secondary/15" },
  { title: "Attendee question spike", body: "32 support questions arrived in the last hour. Consider sending a pinned update.", icon: MessageSquare, tone: "text-flame bg-flame/12" },
]

export default function OrganizerNotificationsPage() {
  return (
    <AppShell role="Organizer" userName="Marcus Reid" title="Notifications">
      <div className="space-y-8">
        <Reveal className="flex flex-col gap-1">
          <h1 className="font-display text-2xl font-bold tracking-tight text-ink">Organizer Notifications</h1>
          <p className="text-sm text-muted-foreground">Stay on top of collaboration requests, AI alerts, and attendee communication spikes.</p>
        </Reveal>

        <Reveal stagger={0.08} y={24} className="grid gap-5 lg:grid-cols-3">
          {organizerNotices.map((notice) => (
            <div key={notice.title} className="rounded-2xl border border-border bg-card p-6 shadow-[0_2px_24px_rgba(0,0,0,0.04)]">
              <span className={`flex size-10 items-center justify-center rounded-xl ${notice.tone}`}>
                <notice.icon className="size-5" />
              </span>
              <h2 className="font-display mt-4 text-base font-semibold text-ink">{notice.title}</h2>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{notice.body}</p>
            </div>
          ))}
        </Reveal>
      </div>
    </AppShell>
  )
}