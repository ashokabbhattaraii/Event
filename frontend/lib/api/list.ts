// Shared types + helpers for paginated list endpoints.

export interface Pagination {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasMore: boolean;
}

export interface Paginated<T> {
  pagination: Pagination;
  // Data lives under a resource-specific key (events/users/tickets), so
  // callers type the full response themselves; this is the shared part.
}

// Common list query params. Extra keys (status, role, category, …) are allowed.
export interface ListParams {
  search?: string;
  page?: number;
  limit?: number;
  sort?: string;
  [key: string]: string | number | undefined;
}

// Serialize params into a query string, dropping empty values and the "all"
// sentinel (which means "no filter"). Returns "" or "?a=1&b=2".
export function toQueryString(params: ListParams = {}): string {
  const sp = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === "" || value === "all") {
      continue;
    }
    sp.append(key, String(value));
  }
  const s = sp.toString();
  return s ? `?${s}` : "";
}
