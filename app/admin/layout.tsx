import type { Metadata } from "next"
import type { ReactNode } from "react"

export const metadata: Metadata = {
  title: "Admin Dashboard — EventNexus",
  description: "Platform-wide analytics, event oversight, and operations.",
}

export default function AdminLayout({ children }: { children: ReactNode }) {
  return children
}
