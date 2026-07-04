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
    <section
      id="problems"
      className="relative overflow-hidden border-y border-white/5 bg-[radial-gradient(circle_at_top,#191b31_0%,#0c0d17_52%,#090a12_100%)] py-20 text-white"
    >
      {/* Top and bottom subtle separating borders */}
      <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent pointer-events-none" />
      <div className="absolute bottom-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent pointer-events-none" />
      
      {/* Ambient background treatment */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-24 left-1/2 -z-10 h-[420px] w-[820px] -translate-x-1/2 rounded-full opacity-[0.16] blur-[120px]"
        style={{ background: "radial-gradient(circle, rgba(91,76,245,0.4) 0%, rgba(0,201,167,0.14) 55%, rgba(0,0,0,0) 100%)" }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 opacity-[0.08]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)",
          backgroundSize: "64px 64px",
          maskImage: "radial-gradient(circle at center, black 25%, transparent 85%)",
        }}
      />
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <CategoryList
          title="Why Current Platforms"
          subtitle="Fall Short Under Load"
          categories={problems}
          headerIcon={<AlertOctagon className="size-7 text-[#00c9a7]" />}
          className="bg-white/[0.02]"
        />
      </div>
    </section>
  )
}
