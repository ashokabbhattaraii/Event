import type { Metadata } from "next"
import type { ReactNode } from "react"

export const metadata: Metadata = {
  title: "Security & IAM — EventNexus",
  description: "Role-based access control, audit logs, sessions, and security posture.",
}

export default function SecurityLayout({ children }: { children: ReactNode }) {
  return children
}
