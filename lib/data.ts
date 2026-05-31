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
