"use client"

import { useState } from "react"
import { Loader2, ShieldCheck, UserCog, Users, Plus, Building2, Eye, EyeOff } from "lucide-react"
import { AppShell } from "@/components/app/app-shell"
import { StatCard } from "@/components/app/stat-card"
import { Reveal } from "@/components/anim/reveal"
import { SearchInput, FilterSelect } from "@/components/app/search-input"
import { Pagination } from "@/components/app/pagination"
import type { CreateUserPayload } from "@/lib/api/users"
import {
  useOrgUsers,
  useUpdateUserRole,
  useCreateUser,
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

export default function AdminUsersPage() {
  const { data: userData } = useCurrentUser()
  const [search, setSearch] = useState("")
  const [role, setRole] = useState("all")
  const [page, setPage] = useState(1)
  const [selectedOrg, setSelectedOrg] = useState<string | null>(null)
  const [showAddModal, setShowAddModal] = useState(false)
  const debouncedSearch = useDebounce(search, 400)
  const user = userData?.user
  const isSystemAdmin = !user?.organization

  const { data: orgsData } = useOrganizations()
  const organizations = orgsData?.organizations ?? []

  // System admins can view any tenant (organizationId), org admins always
  // see their own org.
  const { data, isLoading, isFetching } = useOrgUsers({
    search: debouncedSearch,
    role,
    page,
    limit: 10,
    organizationId: isSystemAdmin ? selectedOrg ?? undefined : undefined,
  })
  const updateRole = useUpdateUserRole()
  const createUser = useCreateUser()
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
  const onOrgChange = (v: string) => {
    setSelectedOrg(v || null)
    setPage(1)
  }

  // Role breakdown across the currently loaded page.
  const admins = users.filter((u) => u.role === "admin").length
  const organizers = users.filter((u) => u.role === "organizer").length
  const attendees = users.filter((u) => u.role === "attendee").length

  const handleCreate = (payload: { name: string; email: string; password: string; role: string; organizationId?: string }) => {
    createUser.mutate(payload as CreateUserPayload, {
      onSuccess: () => setShowAddModal(false),
    })
  }

  const roleOptions = isSystemAdmin ? systemAdminRoleOptions : orgAdminRoleOptions
  const orgFilterOptions = [{ label: "All tenants", value: "" }, ...organizations.map((o) => ({ label: o.name, value: o._id }))]

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
              ? "Manage users across every tenant. Role changes apply immediately."
              : "Manage access for everyone in your organization. Role changes apply immediately."}
          </p>
        </Reveal>

        <Reveal stagger={0.08} y={24} className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Managed Users" value={pagination?.total ?? users.length} icon={Users} accent="primary" />
          <StatCard label="Administrators" value={admins} icon={ShieldCheck} accent="secondary" />
          <StatCard label="Organizers" value={organizers} icon={UserCog} accent="flame" />
          <StatCard label="Attendees" value={attendees} icon={Users} accent="primary" />
        </Reveal>

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
          onCreate={handleCreate}
          isCreating={createUser.isPending}
          error={createUser.isError ? ((createUser.error as any)?.response?.data?.message ?? "Couldn't create user") : null}
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
                    <th className="pb-3 text-right font-medium">Joined</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {users.map((u) => (
                    <tr key={u._id} className="transition-colors hover:bg-muted/40">
                      <td className="py-3.5 pr-4">
                        <div className="font-medium text-ink">{u.name}</div>
                        <div className="text-xs text-muted-foreground">{u.email}</div>
                      </td>
                      <td className="py-3.5">
                        <select
                          value={u.role}
                          disabled={updateRole.isPending}
                          onChange={(e) =>
                            updateRole.mutate({ id: u._id, role: e.target.value })
                          }
                          className="rounded-lg border border-border bg-background px-2 py-1 text-xs font-medium text-ink outline-none focus:border-primary"
                        >
                          {roleOptions.map((r) => (
                            <option key={r} value={r}>
                              {r}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="py-3.5 text-right text-xs text-muted-foreground">
                        {new Date(u.createdAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                  {users.length === 0 && (
                    <tr>
                      <td colSpan={3} className="py-6 text-center text-sm text-muted-foreground">
                        {debouncedSearch || role !== "all" || (isSystemAdmin && selectedOrg)
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
      </div>
    </AppShell>
  )
}
