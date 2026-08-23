// Single source of truth for which roles may open which URL sections.
//
// Kept as data rather than scattered `if (pathname.startsWith(...))` checks
// so the nav, the route guard and any future check all read the same table —
// the previous split (a coarse /admin vs /organizer test in AppShell, plus
// per-page inline banners) let a tenant admin open a system-admin page and
// be told off by a warning box, having already been shown that page's title
// and description.
//
// UI routing only. The server enforces the same rules independently
// (requireSystemAdmin / requireRole on every route) — that is the actual
// security boundary; this exists so the interface never presents a page the
// caller has no business seeing.
type Rule = { prefix: string; roles: string[] }

// Most specific first — the first matching prefix wins.
const RULES: Rule[] = [
  // Platform-wide consoles: approving OTHER tenants, retraining the shared
  // AI models, and global platform settings. A tenant admin has no
  // legitimate use for any of them and the API 403s them outright.
  { prefix: "/admin/approvals", roles: ["admin"] },
  { prefix: "/admin/ai", roles: ["admin"] },
  { prefix: "/admin/settings", roles: ["admin"] },
  // Everything else under /admin is tenant-scoped and serves both the
  // system admin (all tenants) and an org admin (their own).
  { prefix: "/admin", roles: ["admin", "org_admin"] },
  // Organizer workspace: admins land here too via co-hosting and oversight.
  { prefix: "/organizer", roles: ["admin", "org_admin", "organizer"] },
]

const matches = (pathname: string, prefix: string) =>
  pathname === prefix || pathname.startsWith(`${prefix}/`)

export function canAccessPath(role: string | undefined, pathname: string): boolean {
  if (!role) return true // unknown session yet — AppShell withholds the body until it resolves
  const rule = RULES.find((r) => matches(pathname, r.prefix))
  return rule ? rule.roles.includes(role) : true
}
