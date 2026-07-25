"use client"

import { Search, X } from "lucide-react"

/**
 * Controlled search input. Debouncing is the caller's job (via useDebounce on
 * the state it passes in) so pages stay in control of when requests fire.
 */
export function SearchInput({
  value,
  onChange,
  placeholder = "Search...",
  className = "",
}: {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
}) {
  return (
    <div className={`relative ${className}`}>
      <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-xl border border-border bg-card py-2.5 pl-9 pr-9 text-sm text-ink outline-none transition-all focus:border-primary focus:ring-4 focus:ring-primary/10"
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange("")}
          aria-label="Clear search"
          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-ink"
        >
          <X className="size-4" />
        </button>
      )}
    </div>
  )
}

/**
 * Small labelled <select> for equality filters (status, role, category, …).
 * Pass "all" as the value to represent "no filter".
 */
export function FilterSelect({
  value,
  onChange,
  options,
  className = "",
}: {
  value: string
  onChange: (value: string) => void
  options: { label: string; value: string }[]
  className?: string
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={`rounded-xl border border-border bg-card px-3 py-2.5 text-sm font-medium text-ink outline-none transition-colors focus:border-primary ${className}`}
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  )
}
