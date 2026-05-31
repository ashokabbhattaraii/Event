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
} from "lucide-react"
import type { NavItem } from "@/components/app/app-shell"

export const adminNav: NavItem[] = [
  { label: "Dashboard", href: "/admin", icon: LayoutDashboard },
  { label: "Organizations", href: "/admin#organizations", icon: Building2 },
  { label: "Users & Roles", href: "/admin#users", icon: Users },
  { label: "Events", href: "/organizer", icon: CalendarDays },
  { label: "Security & IAM", href: "/admin/security", icon: ShieldCheck },
  { label: "Analytics", href: "/analytics", icon: BarChart3 },
  { label: "System Settings", href: "/admin#settings", icon: Settings },
  { label: "Notifications", href: "/admin#notifications", icon: Bell, badge: 5 },
]

export const organizerNav: NavItem[] = [
  { label: "Dashboard", href: "/organizer", icon: LayoutDashboard },
  { label: "My Events", href: "/organizer", icon: CalendarDays },
  { label: "Collaboration", href: "/organizer/collaboration", icon: Network },
  { label: "Analytics", href: "/analytics", icon: BarChart3 },
  { label: "AI Insights", href: "/organizer#ai", icon: Sparkles },
  { label: "Tickets", href: "/attendee/tickets", icon: Ticket },
  { label: "Notifications", href: "/organizer#notifications", icon: Bell, badge: 3 },
]
