import type { Metadata } from "next"
import type { ReactNode } from "react"

export const metadata: Metadata = {
  title: "Discover Events — EventNexus",
  description: "Browse AI-recommended events, register, and manage your tickets.",
}

export default function AttendeeLayout({ children }: { children: ReactNode }) {
  return children
}
