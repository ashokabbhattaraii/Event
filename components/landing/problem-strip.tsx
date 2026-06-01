"use client"

import { Bot, Link2Off, ShieldAlert, TrendingDown, Unplug, AlertOctagon } from "lucide-react"
import { CategoryList, Category } from "@/components/ui/category-list"

const problems: Category[] = [
  { 
    id: "automation", 
    title: "No Intelligent Automation", 
    subtitle: "Manual, sluggish pipelines that don't scale or learn from attendee behaviors.", 
    icon: <Bot className="size-6" />,
    featured: true
  },
  { 
    id: "collaboration", 
    title: "Siloed Collaboration", 
    subtitle: "Organizations lock key details away, making cross-org workflows complex and slow.", 
    icon: <Link2Off className="size-6" /> 
  },
  { 
    id: "security", 
    title: "Weak Security & Identity", 
    subtitle: "Outdated, static ticketing links and loose access rights leave sensitive data exposed.", 
    icon: <ShieldAlert className="size-6" /> 
  },
  { 
    id: "scalability", 
    title: "Fragile Peak Scalability", 
    subtitle: "High ticket sales demand can cause ticketing checkout flow to bottleneck and freeze.", 
    icon: <TrendingDown className="size-6" /> 
  },
  { 
    id: "integration", 
    title: "No Modern Tool Integrations", 
    subtitle: "Completely disconnected from CRM tools, communication channels, and pipelines teams already run.", 
    icon: <Unplug className="size-6" /> 
  },
]

export function ProblemStrip() {
  return (
    <section id="problems" className="bg-ink py-20 text-white overflow-hidden relative border-y border-white/5">
      {/* Top and bottom subtle separating borders */}
      <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent pointer-events-none" />
      <div className="absolute bottom-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent pointer-events-none" />
      
      {/* Visual background gradient glows */}
      <div
        aria-hidden
        className="pointer-events-none absolute top-10 left-1/2 -translate-x-1/2 -z-10 h-[500px] w-[800px] rounded-full opacity-[0.06] blur-[120px]"
        style={{ background: "linear-gradient(135deg, #ff6b35 0%, #5b4cf5 100%)" }}
      />
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <CategoryList
          title="Why Current Platforms"
          subtitle="Fall Short Under Load"
          categories={problems}
          headerIcon={<AlertOctagon className="size-7 text-[#00c9a7]" />}
          className="bg-zinc-950/40 border border-white/5"
        />
      </div>
    </section>
  )
}
