"use client"

import { useEffect, useState } from "react"
import { Hexagon } from "lucide-react"

const links = [
  { label: "Features", href: "#features" },
  { label: "How It Works", href: "#how" },
  { label: "Organizations", href: "#solution" },
  { label: "Pricing", href: "#pricing" },
  { label: "About", href: "#about" },
]

export function Navbar() {
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 80)
    onScroll()
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-all duration-300 ${
        scrolled ? "glass border-b border-border/60 shadow-[0_2px_24px_rgba(0,0,0,0.04)]" : "bg-transparent"
      }`}
    >
      <nav className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
        <a href="#" className="flex items-center gap-2">
          <span className="bg-brand-gradient flex size-8 items-center justify-center rounded-lg text-primary-foreground">
            <Hexagon className="size-5" strokeWidth={2.5} />
          </span>
          <span className="font-display text-xl font-bold tracking-tight text-ink">EventNexus</span>
        </a>

        <ul className="hidden items-center gap-8 md:flex">
          {links.map((l) => (
            <li key={l.label}>
              <a
                href={l.href}
                className="text-sm font-medium text-muted-foreground transition-colors hover:text-ink"
              >
                {l.label}
              </a>
            </li>
          ))}
        </ul>

        <div className="flex items-center gap-3">
          <a
            href="#"
            className="hidden rounded-full px-4 py-2 text-sm font-medium text-ink transition-colors hover:bg-muted sm:block"
          >
            Log In
          </a>
          <a
            href="#"
            className="rounded-full bg-flame px-5 py-2 text-sm font-semibold text-white shadow-[0_8px_24px_-8px_rgba(255,107,53,0.7)] transition-transform hover:-translate-y-0.5"
          >
            Get Started Free
          </a>
        </div>
      </nav>
    </header>
  )
}
