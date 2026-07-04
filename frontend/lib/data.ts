export type EventStatus = "Upcoming" | "Live" | "Past"

export type AppEvent = {
  id: string
  title: string
  org: string
  date: string
  type: "In-person" | "Hybrid" | "Virtual"
  venue: string
  registered: number
  capacity: number
  predicted: number
  status: EventStatus
  category: string
  matchScore: number
  price: string
  gradient: string
}

export const events: AppEvent[] = [
  {
    id: "devsummit-2026",
    title: "DevSummit 2026",
    org: "Apex Labs",
    date: "Jun 14, 2026 · 09:00",
    type: "Hybrid",
    venue: "APU Auditorium + Online",
    registered: 847,
    capacity: 1000,
    predicted: 920,
    status: "Upcoming",
    category: "Technology",
    matchScore: 94,
    price: "Free",
    gradient: "linear-gradient(135deg,#5b4cf5,#00c9a7)",
  },
  {
    id: "growth-marketing",
    title: "Growth Marketing Live",
    org: "Velocity",
    date: "Jun 02, 2026 · 14:00",
    type: "Virtual",
    venue: "Online",
    registered: 612,
    capacity: 800,
    predicted: 700,
    status: "Live",
    category: "Business",
    matchScore: 88,
    price: "$49",
    gradient: "linear-gradient(135deg,#ff6b35,#5b4cf5)",
  },
  {
    id: "ai-research-forum",
    title: "AI Research Forum",
    org: "Meridian",
    date: "Jul 08, 2026 · 10:30",
    type: "In-person",
    venue: "Meridian HQ, Kuala Lumpur",
    registered: 320,
    capacity: 400,
    predicted: 365,
    status: "Upcoming",
    category: "Academic",
    matchScore: 91,
    price: "Free",
    gradient: "linear-gradient(135deg,#00c9a7,#5b4cf5)",
  },
  {
    id: "founder-mixer",
    title: "Founder Networking Mixer",
    org: "Northwind",
    date: "May 20, 2026 · 18:00",
    type: "In-person",
    venue: "Northwind Rooftop",
    registered: 180,
    capacity: 200,
    predicted: 195,
    status: "Past",
    category: "Social",
    matchScore: 76,
    price: "$25",
    gradient: "linear-gradient(135deg,#5b4cf5,#ff6b35)",
  },
  {
    id: "ux-workshop",
    title: "Hands-on UX Workshop",
    org: "Coreflow",
    date: "Jun 28, 2026 · 13:00",
    type: "Hybrid",
    venue: "Coreflow Studio + Online",
    registered: 96,
    capacity: 120,
    predicted: 110,
    status: "Upcoming",
    category: "Workshop",
    matchScore: 83,
    price: "$15",
    gradient: "linear-gradient(135deg,#00c9a7,#ff6b35)",
  },
  {
    id: "cloud-security-day",
    title: "Cloud Security Day",
    org: "Apex Labs",
    date: "Jul 19, 2026 · 09:30",
    type: "Virtual",
    venue: "Online",
    registered: 540,
    capacity: 1000,
    predicted: 760,
    status: "Upcoming",
    category: "Technology",
    matchScore: 89,
    price: "Free",
    gradient: "linear-gradient(135deg,#5b4cf5,#00c9a7)",
  },
]

export type Organization = {
  name: string
  tenantId: string
  admin: string
  activeEvents: number
  users: number
  status: "Active" | "Suspended" | "Pending"
}

export const platformKpis = {
  revenue: 284900,
  events: 26,
  attendees: 12847,
  fillRate: 84,
}

export const organizations: Organization[] = [
  { name: "Apex Labs", tenantId: "TNT-1024", admin: "R. Tanaka", activeEvents: 8, users: 342, status: "Active" },
  { name: "Velocity", tenantId: "TNT-1025", admin: "S. Okoye", activeEvents: 5, users: 211, status: "Active" },
  { name: "Meridian", tenantId: "TNT-1026", admin: "L. Fernandez", activeEvents: 6, users: 287, status: "Active" },
  { name: "Northwind", tenantId: "TNT-1027", admin: "J. Park", activeEvents: 2, users: 98, status: "Pending" },
  { name: "Coreflow", tenantId: "TNT-1028", admin: "M. Ahmed", activeEvents: 3, users: 154, status: "Suspended" },
]

export const activityFeed = [
  { who: "R. Tanaka", action: "published DevSummit 2026", time: "2m ago", color: "bg-primary" },
  { who: "System", action: "auto-scaled to 4 nodes (peak load)", time: "11m ago", color: "bg-secondary" },
  { who: "S. Okoye", action: "invited Meridian to co-host", time: "26m ago", color: "bg-flame" },
  { who: "L. Fernandez", action: "exported analytics report", time: "44m ago", color: "bg-primary" },
  { who: "J. Park", action: "requested org verification", time: "1h ago", color: "bg-secondary" },
  { who: "EventBot", action: "resolved 38 attendee queries", time: "2h ago", color: "bg-flame" },
]

export const platformActivity = [
  { day: "W1", registrations: 220, logins: 980, events: 4 },
  { day: "W2", registrations: 340, logins: 1120, events: 6 },
  { day: "W3", registrations: 410, logins: 1340, events: 5 },
  { day: "W4", registrations: 560, logins: 1680, events: 9 },
]

export const roleDistribution = [
  { name: "Attendees", value: 1042, fill: "#ff6b35" },
  { name: "Organizers", value: 178, fill: "#00c9a7" },
  { name: "Admins", value: 27, fill: "#5b4cf5" },
]

export const registrationTrend = [
  { d: "Day -7", v: 60 },
  { d: "Day -6", v: 95 },
  { d: "Day -5", v: 180 },
  { d: "Day -4", v: 240 },
  { d: "Day -3", v: 420 },
  { d: "Day -2", v: 560 },
  { d: "Day -1", v: 720 },
  { d: "Day 0", v: 847 },
]

export const predictedVsActual = [
  { event: "DevSummit", predicted: 920, actual: 847 },
  { event: "Growth", predicted: 700, actual: 612 },
  { event: "AI Forum", predicted: 365, actual: 320 },
  { event: "Mixer", predicted: 195, actual: 180 },
  { event: "UX", predicted: 110, actual: 96 },
]

export const ticketTypes = [
  { name: "Free", value: 1240, fill: "#5b4cf5" },
  { name: "Paid", value: 680, fill: "#00c9a7" },
  { name: "VIP", value: 120, fill: "#ff6b35" },
]

export const iamUsers = [
  { name: "Jordan Reyes", email: "jordan@apexlabs.io", role: "Administrator", org: "Apex Labs", mfa: true, status: "Active", last: "Now" },
  { name: "Riku Tanaka", email: "riku@apexlabs.io", role: "Organizer", org: "Apex Labs", mfa: true, status: "Active", last: "2m ago" },
  { name: "Sade Okoye", email: "sade@velocity.co", role: "Organizer", org: "Velocity", mfa: true, status: "Active", last: "18m ago" },
  { name: "Lucia Fernandez", email: "lucia@meridian.org", role: "Organizer", org: "Meridian", mfa: false, status: "Active", last: "1h ago" },
  { name: "James Park", email: "james@northwind.io", role: "Attendee", org: "Northwind", mfa: false, status: "Invited", last: "—" },
  { name: "Mara Ahmed", email: "mara@coreflow.app", role: "Organizer", org: "Coreflow", mfa: true, status: "Suspended", last: "3d ago" },
]

export const roles = [
  { name: "Administrator", users: 27, color: "bg-primary/12 text-primary", desc: "Full platform control, billing, and IAM." },
  { name: "Organizer", users: 178, color: "bg-secondary/15 text-secondary", desc: "Create events, manage teams and check-in." },
  { name: "Attendee", users: 12642, color: "bg-flame/12 text-flame", desc: "Browse, register, and manage tickets." },
]

export const permissionMatrix = [
  { feature: "Create & publish events", admin: true, organizer: true, attendee: false },
  { feature: "Manage IAM & roles", admin: true, organizer: false, attendee: false },
  { feature: "View platform analytics", admin: true, organizer: false, attendee: false },
  { feature: "View own event analytics", admin: true, organizer: true, attendee: false },
  { feature: "Invite collaborators", admin: true, organizer: true, attendee: false },
  { feature: "Check-in attendees", admin: true, organizer: true, attendee: false },
  { feature: "Register & buy tickets", admin: true, organizer: true, attendee: true },
  { feature: "Access AI assistant", admin: true, organizer: true, attendee: true },
]

export const auditLog = [
  { actor: "Jordan Reyes", action: "Granted Administrator role to R. Tanaka", ip: "10.4.21.8", time: "2m ago", level: "info" },
  { actor: "System", action: "Blocked 3 failed login attempts", ip: "203.0.113.42", time: "9m ago", level: "warn" },
  { actor: "Sade Okoye", action: "Enabled MFA on account", ip: "10.4.18.2", time: "26m ago", level: "info" },
  { actor: "System", action: "Suspended Coreflow tenant (policy violation)", ip: "internal", time: "1h ago", level: "danger" },
  { actor: "Lucia Fernandez", action: "Exported attendee PII (consented)", ip: "10.4.30.1", time: "2h ago", level: "info" },
  { actor: "System", action: "Rotated API signing keys", ip: "internal", time: "5h ago", level: "info" },
]

export const sessions = [
  { device: "MacBook Pro · Chrome", location: "San Francisco, US", ip: "10.4.21.8", current: true, time: "Active now" },
  { device: "iPhone 15 · Safari", location: "San Francisco, US", ip: "10.4.21.9", current: false, time: "1h ago" },
  { device: "Windows · Edge", location: "Austin, US", ip: "198.51.100.7", current: false, time: "Yesterday" },
]

export const securityScore = [
  { label: "MFA Adoption", value: 86 },
  { label: "Password Health", value: 92 },
  { label: "Session Hygiene", value: 78 },
  { label: "Access Reviews", value: 64 },
]
