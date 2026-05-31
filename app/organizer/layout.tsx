import type { Metadata } from "next"
import type { ReactNode } from "react"

export const metadata: Metadata = {
  title: "Organizer Dashboard — EventNexus",
  description: "Manage your events, collaborators, and AI-powered insights.",
}

export default function OrganizerLayout({ children }: { children: ReactNode }) {
  return children
}
