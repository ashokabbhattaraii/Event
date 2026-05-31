import { Bot, Link2Off, ShieldAlert, TrendingDown, Unplug } from "lucide-react"

const problems = [
  { icon: Bot, title: "No Intelligent Automation", desc: "Manual workflows that don't scale or learn." },
  { icon: Link2Off, title: "Siloed Collaboration", desc: "Organizations can't work together easily." },
  { icon: ShieldAlert, title: "Weak Security", desc: "Outdated access models leave data exposed." },
  { icon: TrendingDown, title: "Poor Scalability", desc: "Platforms buckle under peak registration loads." },
  { icon: Unplug, title: "No Modern Integration", desc: "Disconnected from the tools teams already use." },
]

export function ProblemStrip() {
  return (
    <section className="bg-ink py-24 text-white">
      <div className="mx-auto max-w-7xl px-6">
        <div className="mx-auto max-w-2xl text-center" data-reveal>
          <span className="inline-block rounded-full bg-white/10 px-4 py-1.5 text-xs font-medium text-secondary">
            The Problem
          </span>
          <h2 className="font-display mt-5 text-balance text-4xl font-bold tracking-tight">
            Why Current Platforms Fall Short
          </h2>
        </div>

        <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {problems.map((p) => (
            <div
              key={p.title}
              data-reveal
              className="group rounded-2xl border-l-2 border-transparent bg-white/[0.04] p-5 backdrop-blur transition-all hover:-translate-y-1.5 hover:border-secondary hover:bg-white/[0.07]"
            >
              <span className="flex size-11 items-center justify-center rounded-xl bg-white/10 text-secondary">
                <p.icon className="size-5" />
              </span>
              <h3 className="font-display mt-4 text-base font-semibold">{p.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-white/60">{p.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
