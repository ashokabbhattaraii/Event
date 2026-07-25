"use client"

import { ChevronLeft, ChevronRight } from "lucide-react"
import type { Pagination as PaginationMeta } from "@/lib/api/list"

/**
 * Prev / next pager with a "showing X–Y of N" summary. Renders nothing when
 * there's a single page and no data, so pages can drop it in unconditionally.
 */
export function Pagination({
  pagination,
  onPageChange,
}: {
  pagination?: PaginationMeta
  onPageChange: (page: number) => void
}) {
  if (!pagination) return null

  const { page, limit, total, totalPages } = pagination
  if (total === 0) return null

  const from = (page - 1) * limit + 1
  const to = Math.min(page * limit, total)

  return (
    <div className="flex flex-col items-center justify-between gap-3 sm:flex-row">
      <p className="text-xs text-muted-foreground">
        Showing <span className="font-medium text-ink">{from}</span>–
        <span className="font-medium text-ink">{to}</span> of{" "}
        <span className="font-medium text-ink">{total}</span>
      </p>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          className="flex items-center gap-1 rounded-lg border border-border bg-card px-3 py-1.5 text-sm font-medium text-ink transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40"
        >
          <ChevronLeft className="size-4" />
          Prev
        </button>

        <span className="px-2 text-sm text-muted-foreground">
          Page <span className="font-semibold text-ink">{page}</span> of {totalPages}
        </span>

        <button
          type="button"
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
          className="flex items-center gap-1 rounded-lg border border-border bg-card px-3 py-1.5 text-sm font-medium text-ink transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40"
        >
          Next
          <ChevronRight className="size-4" />
        </button>
      </div>
    </div>
  )
}
