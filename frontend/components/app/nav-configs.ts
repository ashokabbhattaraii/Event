import {
  LayoutDashboard,
  Building2,
  Users,
  CalendarDays,
  ShieldCheck,
  BarChart3,
  Settings,
  Bell,
  Network,
  Ticket,
  Sparkles,
  Heart,
  QrCode,
  UserCircle,
  Brain,
} from "lucide-react"
import type { NavItem } from "@/components/app/app-shell"

export const adminNav: NavItem[] = [
  { label: "Dashboard", href: "/admin", icon: LayoutDashboard },
  { label: "Organizations", href: "/admin/organizations", icon: Building2 },
  { label: "Users & Roles", href: "/admin/users", icon: Users },
  { label: "Events", href: "/admin/events", icon: CalendarDays },
  { label: "Security & IAM", href: "/admin/security", icon: ShieldCheck },
  { label: "Analytics", href: "/analytics", icon: BarChart3 },
  { label: "AI Training", href: "/admin/ai", icon: Brain },
  { label: "System Settings", href: "/admin/settings", icon: Settings },
  { label: "Notifications", href: "/admin/notifications", icon: Bell, badge: 5 },
  { label: "Settings", href: "/settings", icon: UserCircle },
]

export const organizerNav: NavItem[] = [
  { label: "Dashboard", href: "/organizer", icon: LayoutDashboard },
  { label: "My Events", href: "/organizer/events", icon: CalendarDays },
  { label: "Collaboration", href: "/organizer/collaboration", icon: Network },
  { label: "Analytics", href: "/organizer/analytics", icon: BarChart3 },
  { label: "AI Insights", href: "/organizer/insights", icon: Sparkles },
  { label: "Tickets", href: "/organizer/tickets", icon: Ticket },
  { label: "Notifications", href: "/organizer/notifications", icon: Bell, badge: 3 },
  { label: "Settings", href: "/settings", icon: UserCircle },
]

export const attendeeNav: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "My Tickets", href: "/my-tickets", icon: Ticket },
  { label: "Saved", href: "/saved-events", icon: Heart },
  { label: "Check-in", href: "/check-in", icon: QrCode },
  { label: "Recommendations", href: "/recommendations", icon: Sparkles },
  { label: "Notifications", href: "/notifications", icon: Bell, badge: 2 },
  { label: "Settings", href: "/settings", icon: UserCircle },
]
