import type { Metadata } from "next"
import type { ReactNode } from "react"

export const metadata: Metadata = {
  title: "Analytics — EventNexus",
  description: "AI-powered insights, attendance forecasting, and revenue analytics.",
}

export default function AnalyticsLayout({ children }: { children: ReactNode }) {
  return children
}
