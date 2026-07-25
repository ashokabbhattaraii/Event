"use client"

import { useState } from "react"
import { Loader2, ShieldCheck, UserCog, Users } from "lucide-react"
import { AppShell } from "@/components/app/app-shell"
import { StatCard } from "@/components/app/stat-card"
import { Reveal } from "@/components/anim/reveal"
import { SearchInput, FilterSelect } from "@/components/app/search-input"
import { Pagination } from "@/components/app/pagination"
import { useOrgUsers, useUpdateUserRole } from "@/lib/queries/users"
import { useDebounce } from "@/lib/hooks/use-debounce"

const roleOptions = ["admin", "organizer", "attendee"] as const

const roleFilterOptions = [
  { label: "All roles", value: "all" },
  { label: "Admins", value: "admin" },
  { label: "Organizers", value: "organizer" },
  { label: "Attendees", value: "attendee" },
]

export default function AdminUsersPage() {
  const [search, setSearch] = useState("")
  const [role, setRole] = useState("all")
  const [page, setPage] = useState(1)
  const debouncedSearch = useDebounce(search, 400)

  const { data, isLoading, isFetching } = useOrgUsers({
    search: debouncedSearch,
    role,
    page,
    limit: 10,
  })
  const updateRole = useUpdateUserRole()
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

  // Role breakdown across the currently loaded page.
  const admins = users.filter((u) => u.role === "admin").length
  const organizers = users.filter((u) => u.role === "organizer").length
  const attendees = users.filter((u) => u.role === "attendee").length

  return (
    <AppShell role="Administrator" userName="Admin" title="Users & Roles">
      <div className="space-y-8">
        <Reveal className="flex flex-col gap-1">
          <h1 className="font-display text-2xl font-bold tracking-tight text-ink">Users & Roles</h1>
          <p className="text-sm text-muted-foreground">
            Manage access for everyone in your organization. Role changes apply immediately.
          </p>
        </Reveal>

        <Reveal stagger={0.08} y={24} className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Managed Users" value={pagination?.total ?? users.length} icon={Users} accent="primary" />
          <StatCard label="Administrators" value={admins} icon={ShieldCheck} accent="secondary" />
          <StatCard label="Organizers" value={organizers} icon={UserCog} accent="flame" />
          <StatCard label="Attendees" value={attendees} icon={Users} accent="primary" />
        </Reveal>

        <Reveal className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <SearchInput
            value={search}
            onChange={onSearchChange}
            placeholder="Search users by name or email..."
            className="flex-1"
          />
          <FilterSelect value={role} onChange={onRoleChange} options={roleFilterOptions} />
          {isFetching && <Loader2 className="size-4 animate-spin text-muted-foreground" />}
        </Reveal>

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
                  {users.map((user) => (
                    <tr key={user._id} className="transition-colors hover:bg-muted/40">
                      <td className="py-3.5 pr-4">
                        <div className="font-medium text-ink">{user.name}</div>
                        <div className="text-xs text-muted-foreground">{user.email}</div>
                      </td>
                      <td className="py-3.5">
                        <select
                          value={user.role}
                          disabled={updateRole.isPending}
                          onChange={(e) =>
                            updateRole.mutate({ id: user._id, role: e.target.value })
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
                        {new Date(user.createdAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                  {users.length === 0 && (
                    <tr>
                      <td colSpan={3} className="py-6 text-center text-sm text-muted-foreground">
                        {debouncedSearch || role !== "all"
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
