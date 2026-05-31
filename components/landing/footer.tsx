import { Hexagon, ArrowRight } from "lucide-react"

const columns = [
  { title: "Product", links: ["Features", "Pricing", "Integrations", "Changelog"] },
  { title: "Company", links: ["About", "Careers", "Blog", "Contact"] },
  { title: "Legal", links: ["Privacy", "Terms", "Security", "Compliance"] },
  { title: "Connect", links: ["Twitter", "LinkedIn", "GitHub", "Discord"] },
]

export function Footer() {
  return (
    <footer id="about" className="bg-ink text-white">
      {/* CTA band */}
      <div className="mx-auto max-w-7xl px-6 py-20" data-reveal>
        <div className="bg-brand-gradient relative overflow-hidden rounded-3xl px-8 py-14 text-center shadow-2xl">
          <h2 className="font-display mx-auto max-w-2xl text-balance text-3xl font-bold leading-tight sm:text-4xl">
            Ready to run smarter events, together?
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-pretty text-white/80">
            Join the teams using EventNexus to automate, secure, and scale their events.
          </p>
          <a
            href="#"
            className="group mt-8 inline-flex items-center gap-2 rounded-full bg-white px-7 py-3.5 text-sm font-semibold text-ink transition-transform hover:-translate-y-0.5"
          >
            Get Started Free
            <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
          </a>
        </div>
      </div>

      {/* links */}
      <div className="mx-auto max-w-7xl px-6 pb-12">
        <div className="grid gap-10 border-t border-white/10 pt-12 sm:grid-cols-2 lg:grid-cols-5">
          <div className="lg:col-span-1">
            <div className="flex items-center gap-2">
              <span className="bg-brand-gradient flex size-8 items-center justify-center rounded-lg text-white">
                <Hexagon className="size-5" strokeWidth={2.5} />
              </span>
              <span className="font-display text-lg font-bold">EventNexus</span>
            </div>
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-white/50">
              AI-enabled secure cloud-based event management for multi-organization collaboration.
            </p>
          </div>

          {columns.map((col) => (
            <div key={col.title}>
              <h4 className="font-display text-sm font-semibold">{col.title}</h4>
              <ul className="mt-4 space-y-3">
                {col.links.map((l) => (
                  <li key={l}>
                    <a href="#" className="text-sm text-white/50 transition-colors hover:text-white">
                      {l}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 flex flex-col items-center justify-between gap-3 border-t border-white/10 pt-6 text-xs text-white/40 sm:flex-row">
          <span>© 2026 EventNexus. All rights reserved.</span>
          <span className="font-mono">Built with MERN Stack · Hosted on AWS</span>
        </div>
      </div>
    </footer>
  )
}
