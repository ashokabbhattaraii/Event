"use client"

import { useEffect, useRef, useState, type ReactNode } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  Hexagon,
  LogOut,
  HelpCircle,
  Bell,
  Search,
  Sparkles,
  type LucideIcon,
} from "lucide-react"
import { EventBot } from "@/components/chatbot/event-bot"
import { ensureGsap, prefersReducedMotion } from "@/lib/gsap"

export type NavItem = { label: string; href: string; icon: LucideIcon; badge?: number }

type AppShellProps = {
  children: ReactNode
  nav: NavItem[]
  role: "Administrator" | "Organizer" | "Attendee"
  userName: string
  title?: string
}

const roleColorMap: Record<string, string> = {
  Administrator: "bg-primary/12 text-primary",
  Organizer: "bg-secondary/15 text-secondary",
  Attendee: "bg-flame/12 text-flame",
}

export function AppShell({ children, nav, role, userName, title = "Welcome back" }: AppShellProps) {
  const roleLabel = role
  const roleColor = roleColorMap[role]
  const greeting = title
  const pathname = usePathname()
  const [botOpen, setBotOpen] = useState(false)
  const aside = useRef<HTMLElement>(null)

  useEffect(() => {
    if (prefersReducedMotion()) return
    const gsap = ensureGsap()
    const ctx = gsap.context((self) => {
      const q = self.selector!
      gsap.from(q(".nav-item"), { x: -16, opacity: 0, stagger: 0.05, duration: 0.4, ease: "power2.out" })
    }, aside)
    return () => ctx.revert()
  }, [])

  return (
    <div className="flex min-h-screen bg-background">
      {/* Sidebar */}
      <aside
        ref={aside}
        className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r border-border bg-card lg:flex"
      >
        <div className="flex items-center gap-2 border-b border-border px-5 py-4">
          <span className="bg-brand-gradient flex size-8 items-center justify-center rounded-lg text-white">
            <Hexagon className="size-5" strokeWidth={2.5} />
          </span>
          <span className="font-display text-lg font-bold text-ink">EventNexus</span>
        </div>

        <div className="flex items-center gap-3 border-b border-border px-5 py-4">
          <span className="bg-brand-gradient flex size-10 items-center justify-center rounded-full font-display text-sm font-bold text-white">
            {userName.split(" ").map((n) => n[0]).join("")}
          </span>
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold text-ink">{userName}</div>
            <span className={`mt-0.5 inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold ${roleColor}`}>
              {roleLabel}
            </span>
          </div>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
          {nav.map((item) => {
            const active = pathname === item.href
            return (
              <Link
                key={item.label}
                href={item.href}
                className={`nav-item flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
                  active
                    ? "bg-primary text-primary-foreground shadow-[0_8px_20px_-10px_rgba(91,76,245,0.8)]"
                    : "text-muted-foreground hover:bg-muted hover:text-ink"
                }`}
              >
                <item.icon className="size-[18px] shrink-0" />
                <span className="flex-1">{item.label}</span>
                {item.badge ? (
                  <span
                    className={`flex size-5 items-center justify-center rounded-full text-[10px] font-bold ${
                      active ? "bg-white/20 text-white" : "bg-flame text-white"
                    }`}
                  >
                    {item.badge}
                  </span>
                ) : null}
              </Link>
            )
          })}
        </nav>

        <div className="space-y-1 border-t border-border px-3 py-4">
          <Link
            href="#"
            className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-ink"
          >
            <HelpCircle className="size-[18px]" /> Help
          </Link>
          <Link
            href="/login"
            className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-ink"
          >
            <LogOut className="size-[18px]" /> Logout
          </Link>
        </div>
      </aside>

      {/* Main */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Topbar */}
        <header className="sticky top-0 z-40 flex items-center gap-4 border-b border-border bg-background/85 px-6 py-3.5 backdrop-blur">
          <div>
            <h1 className="font-display text-lg font-bold text-ink">{greeting}</h1>
            <p className="text-xs text-muted-foreground">
              {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
            </p>
          </div>
          <div className="ml-auto flex items-center gap-3">
            <div className="relative hidden sm:block">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <input
                placeholder="Search..."
                className="w-56 rounded-xl border border-border bg-card py-2 pl-9 pr-3 text-sm outline-none focus:border-primary focus:ring-4 focus:ring-primary/10"
              />
            </div>
            <button
              onClick={() => setBotOpen(true)}
              className="bg-brand-gradient flex items-center gap-2 rounded-xl px-3.5 py-2 text-sm font-semibold text-white shadow-[0_8px_20px_-10px_rgba(0,201,167,0.9)] transition-transform hover:-translate-y-0.5"
            >
              <Sparkles className="size-4" /> Ask EventBot
            </button>
            <button
              className="relative flex size-10 items-center justify-center rounded-xl border border-border bg-card text-muted-foreground transition-colors hover:text-ink"
              aria-label="Notifications"
            >
              <Bell className="size-[18px]" />
              <span className="absolute right-2 top-2 size-2 rounded-full bg-flame" />
            </button>
          </div>
        </header>

        <main className="flex-1 px-6 py-6">{children}</main>
      </div>

      <EventBot open={botOpen} onClose={() => setBotOpen(false)} />
    </div>
  )
}
