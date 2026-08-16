"use client"

import { useState } from "react"
import {
  BadgeCheck,
  CheckCircle2,
  CircleDollarSign,
  Clock3,
  CreditCard,
  Loader2,
  RotateCcw,
  Ticket,
  UserRound,
  Wallet,
  type LucideIcon,
} from "lucide-react"
import { SearchInput, FilterSelect } from "@/components/app/search-input"
import { Pagination } from "@/components/app/pagination"
import { useEventAttendees } from "@/lib/queries/tickets"
import { useDebounce } from "@/lib/hooks/use-debounce"
import type { EventAttendee } from "@/lib/api/tickets"

const ticketStatusFilterOptions = [
  { label: "All ticket statuses", value: "all" },
  { label: "Registered", value: "valid" },
  { label: "Checked in", value: "checked-in" },
  { label: "Cancelled", value: "cancelled" },
]

const paymentStatusFilterOptions = [
  { label: "All payments", value: "all" },
  { label: "Paid", value: "paid" },
  { label: "Pending", value: "pending" },
  { label: "Refunded", value: "refunded" },
  { label: "Free (no charge)", value: "none" },
]

// Mirrors price.ts formatting so payment amounts ("Rs. 1,500") read the same
// in the ledger as event prices do everywhere else.
function formatMoney(amount: number, currency = "NPR") {
  const cur = currency.toUpperCase()
  if (cur === "NPR") return `Rs. ${amount.toLocaleString("en-US")}`
  try {
    return new Intl.NumberFormat("en-US", { style: "currency", currency: cur }).format(amount)
  } catch {
    return `${cur} ${amount}`
  }
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("")
}

const ticketPill: Record<EventAttendee["status"], { label: string; className: string }> = {
  "checked-in": { label: "Checked in", className: "bg-secondary/15 text-secondary" },
  valid: { label: "Registered", className: "bg-primary/10 text-primary" },
  cancelled: { label: "Cancelled", className: "bg-destructive/10 text-destructive" },
}

const providerMeta: Record<string, { label: string; icon: LucideIcon; className: string }> = {
  esewa: { label: "eSewa", icon: Wallet, className: "bg-[#60bb46]/15 text-[#3d8f2d]" },
  stripe: { label: "Card", icon: CreditCard, className: "bg-primary/10 text-primary" },
  none: { label: "Free", icon: Ticket, className: "bg-muted text-muted-foreground" },
}

const paymentPill: Record<EventAttendee["payment"]["status"], { label: string; icon: LucideIcon; className: string }> = {
  paid: { label: "Paid", icon: CheckCircle2, className: "bg-secondary/15 text-secondary" },
  pending: { label: "Pending", icon: Clock3, className: "bg-amber-500/15 text-amber-600" },
  refunded: { label: "Refunded", icon: RotateCcw, className: "bg-destructive/10 text-destructive" },
  none: { label: "No charge", icon: CircleDollarSign, className: "bg-muted text-muted-foreground" },
}

function PaymentCell({ attendee }: { attendee: EventAttendee }) {
  const p = attendee.payment
  const provider = providerMeta[p.provider] ?? providerMeta.none
  const status = paymentPill[p.status] ?? paymentPill.none
  const ProviderIcon = provider.icon
  const StatusIcon = status.icon

  return (
    <div className="space-y-1.5">
      <div className="flex flex-wrap items-center gap-1.5">
        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${provider.className}`}>
          <ProviderIcon className="size-3" /> {provider.label}
        </span>
        {p.status !== "none" && (
          <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${status.className}`}>
            <StatusIcon className="size-3" /> {status.label}
          </span>
        )}
      </div>
      <div className="text-left">
        {p.status === "none" ? (
          <span className="text-xs text-muted-foreground">Free registration</span>
        ) : (
          <span
            className={`text-sm font-semibold ${
              p.status === "refunded" ? "text-destructive" : p.status === "paid" ? "text-ink" : "text-amber-600"
            }`}
          >
            {p.status === "refunded" ? "−" : p.status === "paid" ? "+" : ""}
            {formatMoney(p.amount, p.currency)}
          </span>
        )}
        {p.ref && (
          <span className="block text-[10px] text-muted-foreground" title={p.ref}>
            Ref ······{p.ref.slice(-6).toUpperCase()}
          </span>
        )}
      </div>
    </div>
  )
}

function AttendeeRow({ attendee }: { attendee: EventAttendee }) {
  const pill = ticketPill[attendee.status]
  const reg = new Date(attendee.registeredAt)
  return (
    <tr className="border-b border-border last:border-0 hover:bg-muted/30">
      <td className="px-4 py-3.5">
        <div className="flex items-center gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 font-display text-xs font-bold text-primary">
            {initials(attendee.attendee.name)}
          </span>
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold text-ink">{attendee.attendee.name}</div>
            <div className="truncate text-xs text-muted-foreground">{attendee.attendee.email}</div>
          </div>
        </div>
      </td>
      <td className="px-4 py-3.5">
        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${pill.className}`}>
          {attendee.status === "checked-in" && <BadgeCheck className="size-3" />}
          {pill.label}
        </span>
        <div className="mt-1 text-[11px] text-muted-foreground">
          {reg.toLocaleDateString("en-US", { month: "short", day: "numeric" })} ·{" "}
          {reg.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
        </div>
      </td>
      <td className="px-4 py-3.5">
        <PaymentCell attendee={attendee} />
      </td>
      <td className="px-4 py-3.5 text-xs text-muted-foreground">
        {attendee.checkedInAt ? (
          <span className="font-medium text-secondary">
            {new Date(attendee.checkedInAt).toLocaleString("en-US", {
              month: "short",
              day: "numeric",
              hour: "numeric",
              minute: "2-digit",
            })}
          </span>
        ) : attendee.cancelledAt ? (
          `Cancelled ${new Date(attendee.cancelledAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}`
        ) : (
          "—"
        )}
      </td>
    </tr>
  )
}

function StatTile({
  label,
  value,
  sub,
  accent = "text-ink",
}: {
  label: string
  value: string | number
  sub?: string
  accent?: string
}) {
  return (
    <div className="rounded-xl border border-border bg-background p-3 text-center">
      <p className={`font-display text-lg font-bold leading-tight ${accent}`}>{value}</p>
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
      {sub && <p className="text-[10px] text-muted-foreground">{sub}</p>}
    </div>
  )
}

export function AttendeeRoster({
  eventId,
  isOpen,
  limit = 20,
}: {
  eventId: string
  isOpen: boolean
  limit?: number
}) {
  const [search, setSearch] = useState("")
  const [status, setStatus] = useState("all")
  const [paymentStatus, setPaymentStatus] = useState("all")
  const [page, setPage] = useState(1)
  const debouncedSearch = useDebounce(search, 400)
  const { data, isError } = useEventAttendees(
    isOpen ? eventId : undefined,
    { search: debouncedSearch, status, paymentStatus, page, limit }
  )

  if (!isOpen) return null
  if (isError) {
    return (
      <div className="mt-4 rounded-xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
        Couldn't load the attendee list. Make sure you're the organizer or an admin of this event's
        organization.
      </div>
    )
  }
  // Guard on `data`, not `isLoading`: the first render runs before the
  // session-token effect flips (see useHasToken), so the query is disabled
  // and `isLoading` is false while `data` is still undefined — destructuring
  // here used to throw a TypeError on the event workspace page.
  if (!data) {
    return (
      <div className="mt-4 flex items-center justify-center rounded-xl border border-border bg-background py-6">
        <Loader2 className="size-4 animate-spin text-primary" />
      </div>
    )
  }

  const { attendees, counts, pagination } = data!
  const { revenue } = counts
  const filtering = debouncedSearch || status !== "all" || paymentStatus !== "all"

  return (
    <div className="mt-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        <StatTile
          label="Revenue"
          value={formatMoney(revenue.paidAmount)}
          sub={`${revenue.paid} paid ticket${revenue.paid === 1 ? "" : "s"}`}
          accent="text-secondary"
        />
        <StatTile
          label="Pending"
          value={formatMoney(revenue.pendingAmount)}
          sub={`${revenue.pending} awaiting payment`}
          accent="text-amber-600"
        />
        <StatTile
          label="Refunded"
          value={formatMoney(revenue.refundedAmount)}
          sub={`${revenue.refunded} refund${revenue.refunded === 1 ? "" : "s"}`}
          accent="text-destructive"
        />
        <StatTile label="Checked in" value={counts.checkedIn} accent="text-primary" />
        <StatTile label="Registered" value={counts.total} sub={`${revenue.free} free`} />
      </div>

      <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center">
        <SearchInput
          value={search}
          onChange={(v) => {
            setSearch(v)
            setPage(1)
          }}
          placeholder="Search by attendee name or email..."
          className="flex-1"
        />
        <div className="flex flex-wrap gap-3">
          <FilterSelect
            value={status}
            onChange={(v) => {
              setStatus(v)
              setPage(1)
            }}
            options={ticketStatusFilterOptions}
          />
          <FilterSelect
            value={paymentStatus}
            onChange={(v) => {
              setPaymentStatus(v)
              setPage(1)
            }}
            options={paymentStatusFilterOptions}
          />
        </div>
      </div>

      {attendees.length === 0 ? (
        <p className="mt-3 rounded-xl border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">
          {filtering
            ? "No attendees match your search or filters."
            : "No registrations yet. Tickets appear here as attendees register."}
        </p>
      ) : (
        <div className="mt-3 overflow-x-auto rounded-xl border border-border bg-background">
          <table className="w-full min-w-[720px] border-collapse text-left">
            <thead>
              <tr className="border-b border-border bg-muted/40 text-[10px] uppercase tracking-wide text-muted-foreground">
                <th className="px-4 py-2.5 font-semibold">Attendee</th>
                <th className="px-4 py-2.5 font-semibold">Ticket</th>
                <th className="px-4 py-2.5 font-semibold">Payment</th>
                <th className="px-4 py-2.5 font-semibold">Check-in</th>
              </tr>
            </thead>
            <tbody>
              {attendees.map((a) => (
                <AttendeeRow key={a.ticketId} attendee={a} />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {pagination && pagination.totalPages > 1 && (
        <div className="mt-3">
          <Pagination pagination={pagination} onPageChange={setPage} />
        </div>
      )}
    </div>
  )
}