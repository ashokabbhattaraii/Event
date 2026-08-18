"use client"

import { useState } from "react"
import {
  Loader2,
  ShieldCheck,
  UserCog,
  Users,
  Plus,
  Building2,
  Eye,
  EyeOff,
  MoreHorizontal,
  UserRound,
  KeyRound,
  LogOut,
  Trash2,
  RotateCcw,
  CircleAlert,
  ShieldAlert,
  BadgeCheck,
  Globe,
  Mail,
  CalendarClock,
  MonitorSmartphone,
  History,
  Heart,
} from "lucide-react"
import { toast } from "sonner"
import { AppShell } from "@/components/app/app-shell"
import { StatCard } from "@/components/app/stat-card"
import { Reveal } from "@/components/anim/reveal"
import { SearchInput, FilterSelect } from "@/components/app/search-input"
import { Pagination } from "@/components/app/pagination"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import type { CreateUserPayload, OrgUser } from "@/lib/api/users"
import {
  useOrgUsers,
  useOrgStats,
  useUpdateUserRole,
  useUpdateUserStatus,
  useRevokeUserSessions,
  useAdminResetPassword,
  useRemoveUser,
  useCreateUser,
  useUser,
  useUserSessions,
  useUserAudit,
} from "@/lib/queries/users"
import { useCurrentUser } from "@/lib/queries/auth"
import { useOrganizations } from "@/lib/queries/organizations"
import { useDebounce } from "@/lib/hooks/use-debounce"

// Org admins can only manage organizer/attendee roles; the admin role is
// reserved for the system admin to grant (privilege-escalation guard).
const orgAdminRoleOptions = ["organizer", "attendee"] as const
const systemAdminRoleOptions = ["admin", "organizer", "attendee"] as const

const roleFilterOptions = [
  { label: "All roles", value: "all" },
  { label: "Admins", value: "admin" },
  { label: "Organizers", value: "organizer" },
  { label: "Attendees", value: "attendee" },
]

const statusFilterOptions = [
  { label: "All statuses", value: "all" },
  { label: "Active", value: "true" },
  { label: "Deactivated", value: "false" },
]

const roleBadgeStyles: Record<string, string> = {
  admin: "bg-primary/12 text-primary",
  organizer: "bg-secondary/15 text-secondary",
  attendee: "bg-flame/12 text-flame",
}

// Server message or a sane default — every backend error carries a
// human-readable message, and the page surfaces it verbatim.
const errorMessage = (error: unknown, fallback: string) => {
  const msg = (error as any)?.response?.data?.message
  return typeof msg === "string" && msg ? msg : fallback
}

const initials = (name: string) =>
  name
    .split(" ")
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase()

// Relative time ("just now", "4h ago", "12 Mar") — the directory reads
// activity at a glance instead of forcing the eye to parse ISO dates.
const timeAgo = (value?: string | null) => {
  if (!value) return "Never"
  const then = new Date(value).getTime()
  if (Number.isNaN(then)) return "—"
  const secs = Math.max(0, (Date.now() - then) / 1000)
  if (secs < 60) return "just now"
  if (secs < 3600) return `${Math.floor(secs / 60)}m ago`
  if (secs < 86400) return `${Math.floor(secs / 3600)}h ago`
  if (secs < 86400 * 7) return `${Math.floor(secs / 86400)}d ago`
  return new Date(value).toLocaleDateString()
}

const dateShort = (value?: string | null) =>
  value ? new Date(value).toLocaleDateString() : "—"

// --- Add-user modal (unchanged interaction, same contract) ---

interface AddUserModalProps {
  open: boolean
  onClose: () => void
  isSystemAdmin: boolean
  organizations: { _id: string; name: string }[]
  onCreate: (data: { name: string; email: string; password: string; role: string; organizationId?: string }) => void
  isCreating: boolean
  error: string | null
}

function AddUserModal({ open, onClose, isSystemAdmin, organizations, onCreate, isCreating, error }: AddUserModalProps) {
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [role, setRole] = useState("organizer")
  const [orgId, setOrgId] = useState(organizations[0]?._id || "")
  const [showPassword, setShowPassword] = useState(false)

  if (!open) return null

  const roleOptions = isSystemAdmin ? systemAdminRoleOptions : orgAdminRoleOptions
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name || !email || !password) return
    onCreate({ name, email, password, role, organizationId: isSystemAdmin ? orgId : undefined })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-lg rounded-2xl border border-border bg-card p-6 shadow-xl"
      >
        <h2 className="font-display text-lg font-bold text-ink">Add {isSystemAdmin ? "user" : "member"}</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {isSystemAdmin
            ? "Create a platform account and assign it to a tenant."
            : "Create a team member credential for your organization."}
        </p>

        <div className="mt-5 space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="text-xs font-medium text-ink">Full name</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Jane Doe"
                className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-ink outline-none focus:border-primary focus:ring-4 focus:ring-primary/10"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="text-xs font-medium text-ink">Email address</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="jane@example.com"
                className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-ink outline-none focus:border-primary focus:ring-4 focus:ring-primary/10"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="text-xs font-medium text-ink">Role</label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-ink outline-none focus:border-primary"
              >
                {roleOptions.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
              {!isSystemAdmin && (
                <p className="mt-1 text-[10px] text-muted-foreground">
                  Only the system admin can grant the admin role.
                </p>
              )}
            </div>
            {isSystemAdmin && (
              <div>
                <label className="flex items-center gap-1.5 text-xs font-medium text-ink">
                  <Building2 className="size-3.5" /> Organization
                </label>
                <select
                  value={orgId}
                  onChange={(e) => setOrgId(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-ink outline-none focus:border-primary"
                >
                  {organizations.map((o) => (
                    <option key={o._id} value={o._id}>
                      {o.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <div className="sm:col-span-2">
              <label className="text-xs font-medium text-ink">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 pr-10 text-sm text-ink outline-none focus:border-primary focus:ring-4 focus:ring-primary/10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-ink"
                  aria-label={showPassword ? "Hide" : "Show"}
                >
                  {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </div>
          </div>

          {error && (
            <p className="rounded-xl border border-destructive/20 bg-destructive/10 px-3 py-2 text-xs text-destructive">
              {error}
            </p>
          )}
        </div>

        <div className="mt-6 flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-xl border border-border px-4 py-2.5 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-ink"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isCreating || !name || !email || !password || (isSystemAdmin && !orgId)}
            className="flex-1 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-60"
          >
            {isCreating ? "Creating..." : "Create"}
          </button>
        </div>
      </form>
    </div>
  )
}

// --- Confirmation dialog for destructive / high-impact actions ---

interface ConfirmDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description: string
  confirmLabel: string
  destructive?: boolean
  loading?: boolean
  error?: string | null
  onConfirm: () => void
}

function ConfirmDialog({ open, onOpenChange, title, description, confirmLabel, destructive, loading, error, onConfirm }: ConfirmDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={(v) => !loading && onOpenChange(v)}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            {destructive && <ShieldAlert className="size-5 text-destructive" />}
            {title}
          </AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        {error && (
          <p className="rounded-xl border border-destructive/20 bg-destructive/10 px-3 py-2 text-xs text-destructive">
            {error}
          </p>
        )}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            disabled={loading}
            onClick={(e) => {
              e.preventDefault()
              onConfirm()
            }}
            className={destructive ? "bg-destructive text-white hover:bg-destructive/90" : undefined}
          >
            {loading ? <Loader2 className="size-4 animate-spin" /> : confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

// --- User detail dialog: profile, live activity, devices, audit trail ---

function UserDetailDialog({ userId, onClose }: { userId: string; onClose: () => void }) {
  const { data: detailData } = useUser(userId)
  const { data: sessionsData } = useUserSessions(userId)
  const { data: auditData } = useUserAudit(userId)
  const detail = detailData?.user
  const sessions = sessionsData?.sessions ?? []
  const trail = auditData?.logs ?? []

  const activeSessions = sessions.filter((s) => !s.revokedAt)

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-h-[85vh] w-full max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>User Profile</DialogTitle>
          <DialogDescription>
            Live account activity — every metric is queried at the moment the panel opens.
          </DialogDescription>
        </DialogHeader>

        {!detail ? (
          <div className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" /> Loading profile...
          </div>
        ) : (
          <div className="space-y-6">
            {/* Identity header */}
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="flex items-center gap-4">
                <Avatar className="size-14">
                  <AvatarFallback className="bg-primary/12 text-primary">
                    {initials(detail.name)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-display text-lg font-bold text-ink">{detail.name}</p>
                    {!detail.active && <Badge variant="destructive">Deactivated</Badge>}
                  </div>
                  <p className="text-sm text-muted-foreground">{detail.email}</p>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    <Badge className={roleBadgeStyles[detail.role]}>{detail.role}</Badge>
                    <Badge variant="outline" className="gap-1">
                      {detail.googleAccount ? <Globe className="size-3" /> : <Mail className="size-3" />}
                      {detail.googleAccount ? "Google" : "Local"}
                    </Badge>
                    {detail.emailVerifiedAt ? (
                      <Badge variant="outline" className="gap-1 text-emerald-600">
                        <BadgeCheck className="size-3" /> Email verified
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="gap-1 text-amber-600">
                        <CircleAlert className="size-3" /> Email unverified
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Live activity metrics */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
{[
                  { label: "Active sessions", value: activeSessions.length, icon: MonitorSmartphone },
                  { label: "Tickets (active)", value: detail.tickets?.active ?? 0, icon: Users },
                  { label: "Events hosted", value: detail.hostedEventCount, icon: CalendarClock },
                  { label: "Saved events", value: detail.savedCount, icon: Heart },
                ].map((m) => (
                <div key={m.label} className="rounded-xl border border-border bg-muted/40 p-3">
                  <m.icon className="size-4 text-muted-foreground" />
                  <p className="mt-1.5 font-display text-xl font-bold text-ink">{m.value}</p>
                  <p className="text-[11px] text-muted-foreground">{m.label}</p>
                </div>
              ))}
            </div>

            {/* Account facts */}
            <dl className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
              {[
                ["Organization", detail.organizationName || "—"],
                ["Joined", dateShort(detail.createdAt)],
                ["Last active", timeAgo(detail.lastActiveAt)],
                ["Account role", detail.role],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between gap-4 border-b border-border/60 pb-2">
                  <dt className="text-muted-foreground">{k}</dt>
                  <dd className="font-medium text-ink">{v}</dd>
                </div>
              ))}
            </dl>

            {/* Devices / sessions */}
            <div>
              <h3 className="flex items-center gap-2 font-display text-sm font-semibold text-ink">
                <MonitorSmartphone className="size-4" /> Sessions
              </h3>
              <div className="mt-2 space-y-2">
                {activeSessions.length === 0 && (
                  <p className="text-xs text-muted-foreground">No active sessions — the user is signed out everywhere.</p>
                )}
                {activeSessions.slice(0, 5).map((s) => (
                  <div key={s._id as string} className="flex items-center justify-between gap-3 rounded-xl border border-border bg-muted/30 px-3 py-2">
                    <div className="min-w-0">
                      <p className="truncate text-xs font-medium text-ink">
                        {(s.userAgent || "Unknown device").replace(/^[^(]*\(([^)]*)\).*$/, "$1").trim() || s.userAgent || "Unknown device"}
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        {s.ip || "—"} · last used {timeAgo(s.lastUsedAt)}
                      </p>
                    </div>
                    <Badge variant="outline">Active</Badge>
                  </div>
                ))}
              </div>
            </div>

            {/* Audit reflection: every action this account has caused */}
            <div>
              <h3 className="flex items-center gap-2 font-display text-sm font-semibold text-ink">
                <History className="size-4" /> Activity trail
              </h3>
              <div className="mt-2 space-y-1.5">
                {trail.length === 0 && (
                  <p className="text-xs text-muted-foreground">No recorded activity yet.</p>
                )}
                {trail.slice(0, 10).map((log) => (
                  <div key={log._id} className="flex items-center justify-between gap-3 rounded-lg border border-border/60 px-3 py-1.5">
                    <p className="text-xs text-ink">
                      <span className="font-semibold">{log.action.replace(/_/g, " ")}</span>
                      {log.resourceType ? (
                        <span className="text-muted-foreground"> · {log.resourceType}</span>
                      ) : null}
                    </p>
                    <p className="shrink-0 text-[11px] text-muted-foreground">{timeAgo(log.createdAt)}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

// --- Per-row actions menu ---

interface RowActionsProps {
  user: OrgUser
  isSelf: boolean
  onView: () => void
  onToggleStatus: () => void
  onRevoke: () => void
  onResetPassword: () => void
  onRemove: () => void
}

function RowActions({ user, isSelf, onView, onToggleStatus, onRevoke, onResetPassword, onRemove }: RowActionsProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="size-8" aria-label={`Actions for ${user.name}`}>
          <MoreHorizontal className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        <DropdownMenuLabel>{user.name}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={onView}>
          <UserRound className="size-4" /> View profile
        </DropdownMenuItem>
        {user.active ? (
          <DropdownMenuItem onClick={onToggleStatus} disabled={isSelf} className="text-destructive focus:text-destructive">
            <ShieldAlert className="size-4" /> Deactivate account
          </DropdownMenuItem>
        ) : (
          <DropdownMenuItem onClick={onToggleStatus}>
            <RotateCcw className="size-4" /> Reactivate account
          </DropdownMenuItem>
        )}
        <DropdownMenuItem onClick={onRevoke}>
          <LogOut className="size-4" /> Sign out everywhere
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onResetPassword} disabled={user.googleAccount}>
          <KeyRound className="size-4" /> Email reset link
          {user.googleAccount && <span className="sr-only">Google accounts have no password</span>}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={onRemove} disabled={isSelf} className="text-destructive focus:text-destructive">
          <Trash2 className="size-4" /> Remove permanently
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

// Keep the enum in sync with the backend RBAC allow-list.
type RoleOption = (typeof orgAdminRoleOptions)[number] | (typeof systemAdminRoleOptions)[number]

export default function AdminUsersPage() {
  const { data: userData } = useCurrentUser()
  const [search, setSearch] = useState("")
  const [role, setRole] = useState("all")
  const [status, setStatus] = useState("all")
  const [page, setPage] = useState(1)
  const [selectedOrg, setSelectedOrg] = useState<string | null>(null)
  const [showAddModal, setShowAddModal] = useState(false)
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null)
  // Action being confirmed: deactivate | reactivate | revoke | reset | remove
  const [pendingAction, setPendingAction] = useState<{ kind: string; userId: string } | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const debouncedSearch = useDebounce(search, 400)
  const user = userData?.user
  const isSystemAdmin = !user?.organization

  const { data: orgsData } = useOrganizations()
  const organizations = orgsData?.organizations ?? []

  // Accurate platform/tenant numbers come from dedicated aggregates, not
  // from the handful of rows currently on screen.
  const { data: statsData } = useOrgStats()

  // System admins can view any tenant (organizationId), org admins always
  // see their own org.
  const { data, isLoading, isFetching } = useOrgUsers({
    search: debouncedSearch,
    role,
    status,
    page,
    limit: 10,
    organizationId: isSystemAdmin ? selectedOrg ?? undefined : undefined,
  })
  const updateRole = useUpdateUserRole()
  const createUser = useCreateUser()
  const updateStatus = useUpdateUserStatus()
  const revokeSessions = useRevokeUserSessions()
  const resetPassword = useAdminResetPassword()
  const removeUser = useRemoveUser()

  const users = data?.users ?? []
  const pagination = data?.pagination

  const onSearchChange = (v: string) => {
    setSearch(v)
    setPage(1)
  }
  const onRoleChange = (v: string) => {
    setRole(v)
    setPage(1)
  }
  const onStatusChange = (v: string) => {
    setStatus(v)
    setPage(1)
  }
  const onOrgChange = (v: string) => {
    setSelectedOrg(v || null)
    setPage(1)
  }

  const handleRoleChange = (u: OrgUser, next: string) => {
    updateRole.mutate(
      { id: u._id, role: next },
      {
        onSuccess: () =>
          toast.success(
            `${u.name} is now ${next}. They'll be signed out everywhere and asked to log in again.`
          ),
        onError: (e) => toast.error(errorMessage(e, "Couldn't change the role")),
      }
    )
  }

  const confirmAction = () => {
    if (!pendingAction) return
    const { kind, userId } = pendingAction
    setActionError(null)

    const fail = (e: unknown, fallback: string) => {
      // The backend decides what's actually allowed (owner, last admin,
      // tickets, hosted events...) — its message is the authoritative one.
      setActionError(errorMessage(e, fallback))
    }
    const succeed = (msg?: string) => {
      toast.success(msg || "Done")
      setPendingAction(null)
    }

    switch (kind) {
      case "deactivate":
        updateStatus.mutate(
          { id: userId, active: false },
          { onSuccess: (d) => succeed(d.message), onError: (e) => fail(e, "Couldn't deactivate the account") }
        )
        break
      case "reactivate":
        updateStatus.mutate(
          { id: userId, active: true },
          { onSuccess: (d) => succeed(d.message), onError: (e) => fail(e, "Couldn't reactivate the account") }
        )
        break
      case "revoke":
        revokeSessions.mutate(userId, {
          onSuccess: (d) => succeed(d.message),
          onError: (e) => fail(e, "Couldn't revoke sessions"),
        })
        break
      case "reset":
        resetPassword.mutate(userId, {
          onSuccess: (d) => succeed(d.message),
          onError: (e) => fail(e, "Couldn't send the reset link"),
        })
        break
      case "remove":
        removeUser.mutate(userId, {
          onSuccess: (d) => {
            toast.success(d.message)
            setPendingAction(null)
          },
          onError: (e) => fail(e, "Couldn't remove the account"),
        })
        break
    }
  }

  const roleOptions: RoleOption[] = isSystemAdmin ? [...systemAdminRoleOptions] : [...orgAdminRoleOptions]
  const orgFilterOptions = [{ label: "All tenants", value: "" }, ...organizations.map((o) => ({ label: o.name, value: o._id }))]

  // Stats shown must be exact: they come from the dedicated /users/stats
  // aggregate endpoint (counts with filters/scope applied the same way).
  const stats = statsData

  return (
    <AppShell
      role={isSystemAdmin ? "Administrator" : "Administrator"}
      userName={user?.name || "Admin"}
      title="Users & Roles"
    >
      <div className="space-y-8">
        <Reveal className="flex flex-col gap-1">
          <h1 className="font-display text-2xl font-bold tracking-tight text-ink">
            {isSystemAdmin ? "Platform Users" : "Users & Roles"}
          </h1>
          <p className="text-sm text-muted-foreground">
            {isSystemAdmin
              ? "Identity management across every tenant. Role changes apply immediately; account actions are audited and reflected instantly."
              : "Identity management for your organization. Role changes apply immediately; account actions are audited and reflected instantly."}
          </p>
        </Reveal>

        <Reveal stagger={0.08} y={24} className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="Total accounts"
            value={stats?.userCount ?? 0}
            icon={Users}
            accent="primary"
            trend={stats && stats.newThisMonth > 0 ? `+${stats.newThisMonth} this month` : undefined}
          />
          <StatCard
            label="Administrators"
            value={stats?.roleCounts?.admin ?? 0}
            icon={ShieldCheck}
            accent="secondary"
          />
          <StatCard
            label="Organizers"
            value={stats?.roleCounts?.organizer ?? 0}
            icon={UserCog}
            accent="flame"
          />
          <StatCard
            label="Attendees"
            value={stats?.roleCounts?.attendee ?? 0}
            icon={Users}
            accent="primary"
          />
        </Reveal>

        {stats && stats.deactivatedCount > 0 && (
          <Reveal className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-xs text-amber-800">
            <CircleAlert className="size-4 shrink-0" />
            {stats.deactivatedCount} deactivated account{stats.deactivatedCount > 1 ? "s" : ""} — blocked from
            logging in until reactivated.
          </Reveal>
        )}

        <Reveal className="flex flex-col gap-3 sm:flex-row sm:items-center">
          {isSystemAdmin && (
            <FilterSelect
              value={selectedOrg ?? ""}
              onChange={onOrgChange}
              options={orgFilterOptions}
              className="w-full sm:w-56"
            />
          )}
          <SearchInput
            value={search}
            onChange={onSearchChange}
            placeholder="Search users by name or email..."
            className="flex-1"
          />
          <FilterSelect value={role} onChange={onRoleChange} options={roleFilterOptions} />
          <FilterSelect value={status} onChange={onStatusChange} options={statusFilterOptions} />
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-transform hover:-translate-y-0.5"
          >
            <Plus className="size-4" /> Add {isSystemAdmin ? "user" : "member"}
          </button>
          {isFetching && <Loader2 className="size-4 animate-spin text-muted-foreground" />}
        </Reveal>

        <AddUserModal
          open={showAddModal}
          onClose={() => setShowAddModal(false)}
          isSystemAdmin={isSystemAdmin}
          organizations={organizations}
          onCreate={(payload) =>
            createUser.mutate(payload as CreateUserPayload, {
              onSuccess: () => {
                setShowAddModal(false)
                toast.success("Account created — they can sign in immediately.")
              },
              onError: (e) => toast.error(errorMessage(e, "Couldn't create the user")),
            })
          }
          isCreating={createUser.isPending}
          error={
            createUser.isError
              ? errorMessage(createUser.error, "Couldn't create the user")
              : null
          }
        />

        <Reveal className="rounded-2xl border border-border bg-card p-6 shadow-[0_2px_24px_rgba(0,0,0,0.04)]">
          <h2 className="font-display text-lg font-semibold text-ink">User Directory</h2>
          {isLoading ? (
            <div className="mt-5 flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" /> Loading users...
            </div>
          ) : (
            <div className="mt-5 overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-border text-xs uppercase tracking-wide text-muted-foreground">
                    <th className="pb-3 font-medium">User</th>
                    <th className="pb-3 font-medium">Role</th>
                    <th className="pb-3 font-medium">Status</th>
                    {isSystemAdmin && <th className="pb-3 font-medium">Tenant</th>}
                    <th className="pb-3 font-medium">Last active</th>
                    <th className="pb-3 font-medium">Tickets</th>
                    <th className="pb-3 text-right font-medium">Joined</th>
                    <th className="pb-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {users.map((u) => {
                    const isSelf = u._id === user?._id
                    const roleEditable =
                      !isSelf && (isSystemAdmin || roleOptions.includes(u.role as RoleOption))
                    return (
                      <tr key={u._id} className="transition-colors hover:bg-muted/40">
                        <td className="py-3.5 pr-4">
                          <div className="flex items-center gap-3">
                            <Avatar className="size-9">
                              <AvatarFallback className="bg-primary/12 text-xs text-primary">
                                {initials(u.name)}
                              </AvatarFallback>
                            </Avatar>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="truncate font-medium text-ink">{u.name}</span>
                                {isSelf && (
                                  <Badge variant="outline" className="text-[10px]">
                                    you
                                  </Badge>
                                )}
                                {u.googleAccount && (
                                  <Globe className="size-3 shrink-0 text-muted-foreground" aria-label="Google account" />
                                )}
                              </div>
                              <div className="truncate text-xs text-muted-foreground">{u.email}</div>
                            </div>
                          </div>
                        </td>
                        <td className="py-3.5">
                          {roleEditable ? (
                            <select
                              value={u.role}
                              disabled={updateRole.isPending}
                              onChange={(e) => handleRoleChange(u, e.target.value)}
                              className="rounded-lg border border-border bg-background px-2 py-1 text-xs font-medium text-ink outline-none focus:border-primary"
                            >
                              {roleOptions.map((r) => (
                                <option key={r} value={r}>
                                  {r}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <Badge className={roleBadgeStyles[u.role]}>
                              {u.role}
                              {!isSystemAdmin && u.role === "admin" && (
                                <span className="ml-1 font-normal normal-case">
                                  (system-managed)
                                </span>
                              )}
                            </Badge>
                          )}
                        </td>
                        <td className="py-3.5">
                          {u.active ? (
                            <Badge variant="outline" className="gap-1 text-emerald-600">
                              <span className="size-1.5 rounded-full bg-emerald-500" /> Active
                            </Badge>
                          ) : (
                            <Badge variant="destructive" className="gap-1">
                              <span className="size-1.5 rounded-full bg-white/70" /> Deactivated
                            </Badge>
                          )}
                        </td>
                        {isSystemAdmin && (
                          <td className="py-3.5 pr-4 text-xs text-muted-foreground">
                            {u.organizationName || "—"}
                          </td>
                        )}
                        <td className="py-3.5 text-xs text-muted-foreground">{timeAgo(u.lastActiveAt)}</td>
                        <td className="py-3.5 text-xs text-muted-foreground">
                          {u.ticketCount > 0 ? u.ticketCount : "—"}
                        </td>
                        <td className="py-3.5 text-right text-xs text-muted-foreground">
                          {dateShort(u.createdAt)}
                        </td>
                        <td className="py-3.5 pl-4 text-right">
                          <RowActions
                            user={u}
                            isSelf={isSelf}
                            onView={() => setSelectedUserId(u._id)}
                            onToggleStatus={() =>
                              u.active
                                ? setPendingAction({ kind: "deactivate", userId: u._id })
                                : setPendingAction({ kind: "reactivate", userId: u._id })
                            }
                            onRevoke={() => setPendingAction({ kind: "revoke", userId: u._id })}
                            onResetPassword={() => setPendingAction({ kind: "reset", userId: u._id })}
                            onRemove={() => setPendingAction({ kind: "remove", userId: u._id })}
                          />
                        </td>
                      </tr>
                    )
                  })}
                  {users.length === 0 && (
                    <tr>
                      <td colSpan={isSystemAdmin ? 8 : 7} className="py-6 text-center text-sm text-muted-foreground">
                        {debouncedSearch || role !== "all" || status !== "all" || (isSystemAdmin && selectedOrg)
                          ? "No users match your search or filters."
                          : "No users in your organization yet."}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {pagination && pagination.totalPages > 1 && (
            <div className="mt-5">
              <Pagination pagination={pagination} onPageChange={setPage} />
            </div>
          )}
        </Reveal>

        {selectedUserId && (
          <UserDetailDialog userId={selectedUserId} onClose={() => setSelectedUserId(null)} />
        )}

        {/* Action confirmations — each mirrors the backend's exact guards. */}
        <ConfirmDialog
          open={pendingAction?.kind === "deactivate"}
          onOpenChange={(v) => !v && setPendingAction(null)}
          title="Deactivate this account?"
          description="The user is signed out of every device and can't log back in. Their tickets, events and history are kept — the account can be reactivated at any time."
          confirmLabel="Deactivate account"
          destructive
          loading={updateStatus.isPending}
          error={actionError}
          onConfirm={confirmAction}
        />
        <ConfirmDialog
          open={pendingAction?.kind === "reactivate"}
          onOpenChange={(v) => !v && setPendingAction(null)}
          title="Reactivate this account?"
          description="The user can log in again and any future sessions work normally."
          confirmLabel="Reactivate account"
          loading={updateStatus.isPending}
          error={actionError}
          onConfirm={confirmAction}
        />
        <ConfirmDialog
          open={pendingAction?.kind === "revoke"}
          onOpenChange={(v) => !v && setPendingAction(null)}
          title="Sign this user out everywhere?"
          description="Every refresh session is revoked and all outstanding login tokens are invalidated. The account stays active — they just log back in."
          confirmLabel="Sign out everywhere"
          destructive
          loading={revokeSessions.isPending}
          error={actionError}
          onConfirm={confirmAction}
        />
        <ConfirmDialog
          open={pendingAction?.kind === "reset"}
          onOpenChange={(v) => !v && setPendingAction(null)}
          title="Email a password reset link?"
          description="A single-use, 24-hour reset link is emailed to the user. You never see or set their password. (Not available for Google-linked accounts.)"
          confirmLabel="Send reset link"
          loading={resetPassword.isPending}
          error={actionError}
          onConfirm={confirmAction}
        />
        <ConfirmDialog
          open={pendingAction?.kind === "remove"}
          onOpenChange={(v) => !v && setPendingAction(null)}
          title="Remove this account permanently?"
          description="This deletes the account for good — it can't be undone. The backend refuses removal while the user holds tickets or hosts events; deactivation is the recommended alternative."
          confirmLabel="Remove permanently"
          destructive
          loading={removeUser.isPending}
          error={actionError}
          onConfirm={confirmAction}
        />
      </div>
    </AppShell>
  )
}