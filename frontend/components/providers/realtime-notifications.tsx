"use client"

import { useRealtimeNotifications } from "@/lib/queries/notifications"

// Mounted once in the root layout: subscribes the signed-in user to the
// Socket.IO notification channel and surfaces live toasts when activity
// happens elsewhere (new registrations, check-ins, reminders, refunds...).
export function RealtimeNotifications() {
  useRealtimeNotifications()
  return null
}