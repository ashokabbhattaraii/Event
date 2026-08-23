"use client"

import { useRouter } from "next/navigation"
import { Bell, CheckCheck, ChevronRight, Loader2 } from "lucide-react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import {
  useMarkAllNotificationsRead,
  useNotifications,
  useUnreadCount,
} from "@/lib/queries/notifications"
import type { Notification } from "@/lib/api/notifications"
import { cn } from "@/lib/utils"

// Role-aware section path so the dropdown's "View all"/detail links land on
// the right page for whoever is signed in.
function sectionForRole(): string {
  try {
    const user = JSON.parse(localStorage.getItem("user") || "{}")
    if (user?.role === "admin" || user?.role === "org_admin") return "/admin/notifications"
    if (user?.role === "organizer") return "/organizer/notifications"
  } catch {}
  return "/notifications"
}

function timeAgo(date: string): string {
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000)
  if (seconds < 60) return "Just now"
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return days === 1 ? "Yesterday" : `${days}d ago`
}

export function NotificationBell({ role }: { role: "Administrator" | "Organizer" | "Attendee" }) {
  const router = useRouter()
  const unreadCount = useUnreadCount()?.data ?? 0
  const { data, isLoading } = useNotifications({ limit: 6 })
  const markAllRead = useMarkAllNotificationsRead()
  const notifications = data?.notifications ?? []
  const section = sectionForRole()

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          className="relative flex size-10 shrink-0 items-center justify-center rounded-xl border border-border bg-card text-muted-foreground transition-colors hover:text-ink"
          aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ""}`}
        >
          <Bell className="size-[18px]" />
          {unreadCount > 0 && (
            <span className="absolute right-1.5 top-1.5 flex size-4 items-center justify-center rounded-full bg-flame text-[9px] font-bold text-white">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </button>
      </PopoverTrigger>

      <PopoverContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <p className="text-sm font-semibold text-ink">Notifications</p>
          {unreadCount > 0 && (
            <button
              onClick={() => markAllRead.mutate()}
              className="flex items-center gap-1 text-xs font-medium text-primary transition-colors hover:underline"
            >
              <CheckCheck className="size-3.5" /> Mark all read
            </button>
          )}
        </div>

        <div className="max-h-80 overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center gap-2 py-8 text-xs text-muted-foreground">
              <Loader2 className="size-4 animate-spin" /> Loading...
            </div>
          ) : notifications.length === 0 ? (
            <p className="px-4 py-8 text-center text-xs text-muted-foreground">
              No notifications yet.
            </p>
          ) : (
            notifications.map((notice) => (
              <button
                key={notice._id}
                onClick={() => {
                  router.push(`${section}/${notice._id}`)
                }}
                className={cn(
                  "flex w-full items-start gap-3 border-b border-border/60 px-4 py-3 text-left transition-colors last:border-0 hover:bg-muted/50",
                  !notice.read && "bg-primary/[0.04]"
                )}
              >
                <span
                  className={cn(
                    "mt-1.5 size-2 shrink-0 rounded-full",
                    notice.read ? "bg-border" : "bg-flame"
                  )}
                  aria-hidden="true"
                />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-ink">{notice.title}</span>
                  <span className="mt-0.5 line-clamp-2 block text-xs leading-relaxed text-muted-foreground">
                    {notice.message}
                  </span>
                  <span className="mt-1 block text-[10px] uppercase tracking-wide text-muted-foreground/80">
                    {timeAgo(notice.createdAt)}
                  </span>
                </span>
                <ChevronRight className="mt-1 size-4 shrink-0 text-muted-foreground/60" />
              </button>
            ))
          )}
        </div>

        <button
          onClick={() => router.push(section)}
          className="flex w-full items-center justify-center gap-1 border-t border-border px-4 py-2.5 text-xs font-semibold text-primary transition-colors hover:bg-muted/50"
        >
          View all notifications
        </button>
      </PopoverContent>
    </Popover>
  )
}