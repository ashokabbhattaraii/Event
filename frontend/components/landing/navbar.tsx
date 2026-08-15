"use client"

import Link from "next/link"
import { Hexagon, LayoutDashboard } from "lucide-react"
import { useCurrentUser, useLogout } from "@/lib/queries/auth"

const links = [
  { label: "Features", href: "#features" },
  { label: "How It Works", href: "#how" },
  { label: "Admin", href: "/admin" },
  { label: "Organizer", href: "/organizer" },
  { label: "Dashboard", href: "/dashboard" },
]

const roleHome: Record<string, string> = {
  admin: "/admin",
  organizer: "/organizer",
  attendee: "/dashboard",
}

export function Navbar() {
  const { data: userData } = useCurrentUser()
  const logout = useLogout()
  const user = userData?.user

  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-border/80 bg-background shadow-[0_2px_18px_rgba(15,23,42,0.06)]">
      <nav className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
        <Link href="/" className="flex items-center gap-2">
          <span className="bg-brand-gradient flex size-8 items-center justify-center rounded-lg text-primary-foreground">
            <Hexagon className="size-5" strokeWidth={2.5} />
          </span>
          <span className="font-display text-xl font-bold tracking-tight text-ink">EventNexus</span>
        </Link>

        <ul className="hidden items-center gap-8 md:flex">
          {links.map((l) => (
            <li key={l.label}>
              <Link
                href={l.href}
                className="text-sm font-medium text-muted-foreground transition-colors hover:text-ink"
              >
                {l.label}
              </Link>
            </li>
          ))}
        </ul>

        {user ? (
          <div className="flex items-center gap-3">
            <Link
              href={roleHome[user.role] || "/dashboard"}
              className="bg-brand-gradient flex items-center gap-2 rounded-full px-5 py-2 text-sm font-semibold text-white shadow-[0_8px_24px_-8px_rgba(91,76,245,0.7)] transition-transform hover:-translate-y-0.5"
            >
              <LayoutDashboard className="size-4" /> Dashboard
            </Link>
            <button
              onClick={logout}
              className="hidden rounded-full border border-border px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-ink sm:block"
            >
              Logout
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="hidden rounded-full px-4 py-2 text-sm font-medium text-ink transition-colors hover:bg-muted sm:block"
            >
              Log In
            </Link>
            <Link
              href="/register"
              className="rounded-full bg-flame px-5 py-2 text-sm font-semibold text-white shadow-[0_8px_24px_-8px_rgba(255,107,53,0.7)] transition-transform hover:-translate-y-0.5"
            >
              Get Started Free
            </Link>
          </div>
        )}
      </nav>
    </header>
  )
}
