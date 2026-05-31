"use client"

import { ArrowRight, Play, Zap, ChevronDown, TrendingUp, Users, Calendar } from "lucide-react"

export function Hero() {
  return (
    <section className="relative overflow-hidden pt-28 pb-20 lg:pt-36">
      {/* abstract gradient blob */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-32 left-1/2 -z-10 h-[520px] w-[820px] -translate-x-1/2 rounded-full opacity-[0.18] blur-3xl"
        style={{ background: "linear-gradient(135deg, #5b4cf5 0%, #00c9a7 100%)" }}
      />

      <div className="mx-auto grid max-w-7xl items-center gap-12 px-6 lg:grid-cols-[1.05fr_0.95fr]">
        {/* Left */}
        <div>
          <div className="hero-line inline-flex items-center gap-2 rounded-full border border-border bg-card/70 px-4 py-1.5 text-xs font-medium text-ink shadow-sm backdrop-blur">
            <Zap className="size-3.5 text-flame" />
            AI-Powered · Cloud-Native · Multi-Org
          </div>

          <h1 className="font-display mt-6 text-balance text-5xl font-extrabold leading-[1.05] tracking-tight text-ink lg:text-[64px]">
            <span className="hero-line block">The Smartest Way</span>
            <span className="hero-line block">
              to Manage Events —{" "}
              <span className="relative inline-block">
                <span className="text-gradient">Together</span>
                <svg
                  className="absolute -bottom-2 left-0 w-full"
                  viewBox="0 0 200 12"
                  fill="none"
                  preserveAspectRatio="none"
                  aria-hidden
                >
                  <path
                    d="M2 9C50 3 150 3 198 9"
                    stroke="url(#ug)"
                    strokeWidth="4"
                    strokeLinecap="round"
                  />
                  <defs>
                    <linearGradient id="ug" x1="0" y1="0" x2="200" y2="0">
                      <stop stopColor="#5b4cf5" />
                      <stop offset="1" stopColor="#00c9a7" />
                    </linearGradient>
                  </defs>
                </svg>
              </span>
            </span>
          </h1>

          <p className="hero-line mt-7 max-w-xl text-pretty text-base leading-relaxed text-muted-foreground">
            EventNexus brings AI intelligence, secure cloud infrastructure, and real-time
            collaboration to every event — from small workshops to global multi-organization
            conferences.
          </p>

          <div className="hero-line mt-9 flex flex-wrap items-center gap-4">
            <a
              href="#"
              className="group inline-flex items-center gap-2 rounded-full bg-primary px-7 py-3.5 text-sm font-semibold text-primary-foreground shadow-[0_12px_32px_-10px_rgba(91,76,245,0.8)] transition-transform hover:-translate-y-0.5"
            >
              Start for Free
              <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
            </a>
            <a
              href="#"
              className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-7 py-3.5 text-sm font-semibold text-ink transition-colors hover:bg-muted"
            >
              <Play className="size-4 fill-current" />
              Watch Demo
            </a>
          </div>
        </div>

        {/* Right - dashboard mockup */}
        <div className="hero-visual relative">
          <div
            aria-hidden
            className="absolute inset-0 -z-10 rounded-[28px] opacity-40 blur-2xl"
            style={{ background: "linear-gradient(135deg, #5b4cf5 0%, #00c9a7 100%)" }}
          />
          <div className="rounded-[24px] border border-border bg-card p-4 shadow-[0_30px_80px_-30px_rgba(26,26,46,0.35)] [transform:perspective(1600px)_rotateY(-10deg)_rotateX(4deg)]">
            {/* mock header */}
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <span className="bg-brand-gradient size-6 rounded-md" />
                <span className="font-display text-sm font-bold text-ink">Live Dashboard</span>
              </div>
              <div className="flex gap-1.5">
                <span className="size-2.5 rounded-full bg-flame/70" />
                <span className="size-2.5 rounded-full bg-secondary/70" />
                <span className="size-2.5 rounded-full bg-primary/70" />
              </div>
            </div>

            {/* mock KPIs */}
            <div className="mt-4 grid grid-cols-3 gap-3">
              {[
                { icon: Calendar, label: "Events", value: "38", c: "text-flame" },
                { icon: Users, label: "Attendees", value: "1.2k", c: "text-primary" },
                { icon: TrendingUp, label: "Uptime", value: "99.9%", c: "text-secondary" },
              ].map((k) => (
                <div key={k.label} className="rounded-xl bg-muted/60 p-3">
                  <k.icon className={`size-4 ${k.c}`} />
                  <div className="font-mono mt-2 text-lg font-bold text-ink">{k.value}</div>
                  <div className="text-[11px] text-muted-foreground">{k.label}</div>
                </div>
              ))}
            </div>

            {/* mock chart */}
            <div className="mt-3 rounded-xl bg-muted/60 p-4">
              <div className="mb-3 flex items-center justify-between">
                <span className="text-xs font-medium text-ink">Platform Activity</span>
                <span className="rounded-full bg-secondary/15 px-2 py-0.5 text-[10px] font-medium text-secondary">
                  +12%
                </span>
              </div>
              <div className="flex h-24 items-end gap-1.5">
                {[40, 55, 35, 70, 50, 80, 62, 90, 75, 95, 68, 88].map((h, i) => (
                  <div
                    key={i}
                    className="bar flex-1 rounded-t bg-brand-gradient"
                    style={{ height: `${h}%` }}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* floating AI chip */}
          <div className="ai-chip glass absolute -left-4 bottom-10 flex items-center gap-2 rounded-2xl border border-border px-4 py-3 shadow-lg">
            <span className="bg-brand-gradient flex size-8 items-center justify-center rounded-full text-white">
              <Zap className="size-4" />
            </span>
            <div>
              <div className="text-xs font-semibold text-ink">AI Prediction</div>
              <div className="text-[11px] text-muted-foreground">920 attendees expected</div>
            </div>
          </div>
        </div>
      </div>

      {/* scroll indicator */}
      <div className="mt-16 flex justify-center">
        <ChevronDown className="scroll-chevron size-6 text-muted-foreground" />
      </div>
    </section>
  )
}
