"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

// The attendee home is now the Events hub (search + filters + newest-first
// listings). This route is kept as a redirect so older links, post-login
// redirects (lib/queries/auth.ts) and landing CTAs keep working.
export default function AttendeeDashboardRedirect() {
  const router = useRouter()

  useEffect(() => {
    router.replace("/events")
  }, [router])

  return null
}