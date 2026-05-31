import type { LucideIcon } from "lucide-react"
import { ArrowUpRight } from "lucide-react"
import { CountUp } from "@/components/anim/count-up"

type StatCardProps = {
  icon: LucideIcon
  label: string
  value: number
  prefix?: string
  suffix?: string
  decimals?: number
  trend?: string
  accent: "primary" | "secondary" | "flame"
}

const accentMap = {
  primary: "bg-primary/10 text-primary",
  secondary: "bg-secondary/15 text-secondary",
  flame: "bg-flame/12 text-flame",
}

export function StatCard({
  icon: Icon,
  label,
  value,
  prefix,
  suffix,
  decimals,
  trend,
  accent,
}: StatCardProps) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-[0_2px_24px_rgba(0,0,0,0.04)] transition-all hover:-translate-y-1 hover:shadow-[0_18px_40px_-24px_rgba(26,26,46,0.35)]">
      <div className="flex items-center justify-between">
        <span className={`flex size-10 items-center justify-center rounded-xl ${accentMap[accent]}`}>
          <Icon className="size-5" />
        </span>
        {trend && (
          <span className="inline-flex items-center gap-0.5 rounded-full bg-secondary/12 px-2 py-1 text-[11px] font-semibold text-secondary">
            <ArrowUpRight className="size-3" />
            {trend}
          </span>
        )}
      </div>
      <div className="font-display mt-4 text-3xl font-extrabold tracking-tight text-ink">
        <CountUp to={value} prefix={prefix} suffix={suffix} decimals={decimals} />
      </div>
      <div className="mt-1 text-sm text-muted-foreground">{label}</div>
    </div>
  )
}
