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
  ClipboardCheck,
} from "lucide-react"
import type { NavItem } from "@/components/app/app-shell"

// The platform-wide System Administrator (an "admin" user with NO
// organization — see requireSystemAdmin on the backend). Every item here is
// genuinely platform-scoped: approving/suspending other tenants, editing
// system-wide RBAC roles, retraining the shared AI models, global settings.
// A tenant admin must never see this nav — several of these routes 403 for
// them by design (org approvals, AI training), and the rest would show them
// data/actions far beyond their own organization.
export const adminNav: NavItem[] = [
  { label: "Dashboard", href: "/admin", icon: LayoutDashboard },
  { label: "Organizations", href: "/admin/organizations", icon: Building2 },
  { label: "Org Approvals", href: "/admin/approvals", icon: ClipboardCheck },
  { label: "Users & Roles", href: "/admin/users", icon: Users },
  { label: "Events", href: "/admin/events", icon: CalendarDays },
  { label: "Security & IAM", href: "/admin/security", icon: ShieldCheck },
  { label: "Analytics", href: "/analytics", icon: BarChart3 },
  { label: "AI Training", href: "/admin/ai", icon: Brain },
  { label: "System Settings", href: "/admin/settings", icon: Settings },
  { label: "Notifications", href: "/admin/notifications", icon: Bell, badge: 5 },
  { label: "Settings", href: "/settings", icon: UserCircle },
]

// A tenant/Org Admin ("admin" role WITH an organization). Every route below
// is backed by a controller that scopes its query to req.user.organization
// (see userController.listOrgUsers, eventController.getOrgEvents,
// analyticsController.buildUserEventFilter, iamController's org-role guard)
// — so this nav only ever shows items that actually work, and actually stay
// inside their own tenant, for this account. Stays on /admin/* URLs (not
// /organizer/*) so the shell doesn't flip role/branding mid-navigation.
export const orgAdminNav: NavItem[] = [
  { label: "Dashboard", href: "/admin", icon: LayoutDashboard },
  // /admin/organizations is dual-purpose: the system admin gets the tenant
  // directory, an org admin gets their own organization's profile. It was
  // missing here, so org admins had no way to reach a page built for them.
  { label: "Organization", href: "/admin/organizations", icon: Building2 },
  { label: "Users & Roles", href: "/admin/users", icon: Users },
  { label: "Events", href: "/admin/events", icon: CalendarDays },
  { label: "Collaboration", href: "/admin/collaboration", icon: Network },
  { label: "Security & IAM", href: "/admin/security", icon: ShieldCheck },
  { label: "Analytics", href: "/analytics", icon: BarChart3 },
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
  { label: "Events", href: "/events", icon: CalendarDays },
  { label: "My Tickets", href: "/my-tickets", icon: Ticket },
  { label: "Saved", href: "/saved-events", icon: Heart },
  { label: "Check-in", href: "/check-in", icon: QrCode },
  { label: "Recommendations", href: "/recommendations", icon: Sparkles },
  { label: "Notifications", href: "/notifications", icon: Bell, badge: 2 },
  { label: "Settings", href: "/settings", icon: UserCircle },
]
