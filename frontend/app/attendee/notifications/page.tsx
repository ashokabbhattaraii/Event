import { Bell, CalendarCheck2, Sparkles } from "lucide-react"
import { AppShell } from "@/components/app/app-shell"
import { Reveal } from "@/components/anim/reveal"

const notices = [
  { title: "Ticket reminder", body: "Growth Marketing Live starts in 2 hours. Check-in opens 30 minutes before start time.", tone: "text-primary bg-primary/12", icon: CalendarCheck2 },
  { title: "New recommendation", body: "AI Research Forum is a 91% match for your interests in cloud and AI security.", tone: "text-secondary bg-secondary/15", icon: Sparkles },
  { title: "Event update", body: "DevSummit 2026 added a new keynote track and updated venue wayfinding details.", tone: "text-flame bg-flame/12", icon: Bell },
]

export default function AttendeeNotificationsPage() {
  return (
    <AppShell role="Attendee" userName="Ava Lindqvist" title="Notifications">
      <div className="space-y-8">
        <Reveal className="flex flex-col gap-1">
          <h1 className="font-display text-2xl font-bold tracking-tight text-ink">Notifications</h1>
          <p className="text-sm text-muted-foreground">Stay updated on event changes, reminders, and new recommendations.</p>
        </Reveal>

        <Reveal stagger={0.08} y={24} className="grid gap-5 lg:grid-cols-3">
          {notices.map((notice) => (
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