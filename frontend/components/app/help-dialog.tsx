"use client"

import { useEffect } from "react"
import {
  Bot,
  HelpCircle,
  LifeBuoy,
  Mail,
  MessageSquareText,
  Sparkles,
  X,
} from "lucide-react"

type HelpDialogProps = {
  open: boolean
  role: "Administrator" | "Organizer" | "Attendee"
  onClose: () => void
  onAskBot: () => void
}

const FAQ: Record<HelpDialogProps["role"], { q: string; a: string }[]> = {
  Administrator: [
    {
      q: "How do I approve a new organization?",
      a: "Open Organizations → Pending approvals and click Approve. The org owner is notified instantly.",
    },
    {
      q: "How do I manage user roles?",
      a: "Users & Roles lets you assign organizer or attendee roles and review IAM permissions per role.",
    },
    {
      q: "Where do payment failures show up?",
      a: "Security & IAM and Analytics surfaces failed checkouts; the Attendee roster in each event shows per-ticket payment status.",
    },
  ],
  Organizer: [
    {
      q: "How do I publish a session schedule?",
      a: "Open an event's workspace → Sessions & schedule. Add talks with track, time, room and speakers; attendees see the public agenda automatically.",
    },
    {
      q: "How do reminders work?",
      a: "The Reminders panel saves offsets (e.g. 1 day before). The server scheduler delivers in-app + email reminders and a feedback nudge automatically.",
    },
    {
      q: "How do I check attendees in?",
      a: "Tickets → Verify a Ticket. Scan the QR or paste the token; the roster updates instantly with payment and check-in status.",
    },
  ],
  Attendee: [
    {
      q: "Where is my ticket QR?",
      a: "My Tickets → open a ticket. Present the QR at the venue; organizers scan it for check-in.",
    },
    {
      q: "Can I cancel a registration?",
      a: "Yes, from the event page before it starts — free tickets instantly, paid tickets need organizer refunds.",
    },
    {
      q: "How do I get reminders?",
      a: "They're automatic once you register: in-app notifications plus an email before the event and after it ends.",
    },
  ],
}

const CONTACT_EMAIL = "support@eventnexus.dev"

export function HelpDialog({ open, role, onClose, onAskBot }: HelpDialogProps) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    window.addEventListener("keydown", onKey)
    document.body.style.overflow = "hidden"
    return () => {
      window.removeEventListener("keydown", onKey)
      document.body.style.overflow = ""
    }
  }, [open, onClose])

  if (!open) return null
  const faqs = FAQ[role]

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label="Help">
      <div className="absolute inset-0 bg-ink/40 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />
      <div className="relative flex max-h-[85vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-2xl">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div className="flex items-center gap-2">
            <span className="bg-brand-gradient flex size-9 items-center justify-center rounded-xl text-white">
              <LifeBuoy className="size-5" />
            </span>
            <div>
              <h2 className="font-display text-base font-bold text-ink">How can we help?</h2>
              <p className="text-xs text-muted-foreground">Quick answers for {role}s</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex size-9 items-center justify-center rounded-xl border border-border bg-background text-muted-foreground transition-colors hover:text-ink"
            aria-label="Close help"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
          <button
            onClick={onAskBot}
            className="flex w-full items-center gap-3 rounded-xl bg-primary/5 p-4 text-left transition-colors hover:bg-primary/10"
          >
            <span className="bg-brand-gradient flex size-9 shrink-0 items-center justify-center rounded-xl text-white">
              <Bot className="size-5" />
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-semibold text-ink">Ask EventBot</span>
              <span className="block text-xs text-muted-foreground">
                Instant answers about events, capacity, pricing, and more.
              </span>
            </span>
            <Sparkles className="ml-auto size-4 shrink-0 text-primary" />
          </button>

          <div>
            <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              <HelpCircle className="size-3.5" /> Frequently asked
            </div>
            <div className="space-y-2">
              {faqs.map((f) => (
                <div key={f.q} className="rounded-xl border border-border bg-background p-3.5">
                  <div className="text-sm font-semibold text-ink">{f.q}</div>
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{f.a}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="border-t border-border px-5 py-3.5">
          <a
            href={`mailto:${CONTACT_EMAIL}`}
            className="flex items-center justify-center gap-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-primary"
          >
            <Mail className="size-3.5" /> Still stuck? Email {CONTACT_EMAIL}
          </a>
        </div>
      </div>
    </div>
  )
}