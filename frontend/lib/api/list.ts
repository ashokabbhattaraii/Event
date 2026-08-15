// Shared types + helpers for advanced paginated list endpoints.

// Core pagination metadata (returned by backend)
export interface Pagination {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasMore: boolean;
}

// Cursor-based pagination (alternative to page-based)
export interface CursorPagination {
  limit: number;
  hasMore: boolean;
  nextCursor: string | null;
  prevCursor: string | null;
}

// Unified pagination type (supports both page-based and cursor-based)
export interface PaginationResponse<T> {
  data: T[];
  pagination: Pagination | CursorPagination;
  // Cursor pagination specific fields
  nextCursor?: string | null;
  prevCursor?: string | null;
}

// Common list query params. Extra keys are allowed for filters.
export interface ListParams {
  // Pagination
  page?: number;
  limit?: number;
  cursor?: string;
  direction?: "next" | "prev";
  
  // Search
  search?: string;
  searchExact?: boolean;
  
  // Sorting
  sort?: string; // e.g., "-createdAt" or "-createdAt,title"
  
  // Filters - equality (supports single values and arrays for multi-select)
  [key: string]: string | number | boolean | string[] | undefined;
}

// Advanced filter params (for complex queries)
export interface AdvancedFilterParams extends ListParams {
  // Search options
  searchExact?: boolean;
  
  // Equality filters (exact match)
  // These are defined by the specific endpoint
  
  // Range filters - numeric
  // Format: field[min]=10&field[max]=100 or field[gte]=10&field[lte]=100
  
  // Date range filters
  // field[from]=2024-01-01&field[to]=2024-12-31
  // Or presets: date_preset=today|thisWeek|thisMonth|lastWeek|lastMonth|nextWeek|nextMonth|upcoming|past
  
  // Range filters - numeric
  // field[min]=10&field[max]=100 or field[gte]=10&field[lte]=100
  // field[gt]=10&field[lt]=100
  
  // Date presets
  // date_preset=today|thisWeek|thisMonth|lastWeek|lastMonth|nextWeek|nextMonth|upcoming|past
  
  // Array filters (IN queries)
  // field=value1,value2,value3
  
  // Nested field filters
  // field.subfield=value
}

// Cursor-based pagination params
export interface CursorParams {
  cursor?: string;
  direction?: "next" | "prev";
  limit?: number;
  sort?: string;
}

// Sort options
export interface SortOption {
  field: string;
  label: string;
  directions: ("asc" | "desc")[];
  defaultDirection: "asc" | "desc";
}

// Filter option definitions for UI
export interface FilterOption {
  key: string;
  label: string;
  type: "select" | "multiSelect" | "dateRange" | "numberRange" | "text" | "boolean" | "selectPreset";
  options?: { value: string; label: string }[];
  placeholder?: string;
  // For date range presets
  presets?: { value: string; label: string }[];
  // For number range
  min?: number;
  max?: number;
  step?: number;
  // For dependent filters
  dependsOn?: string;
  dependsValue?: string;
}

// Filter state for UI
export interface FilterState {
  [key: string]: string | string[] | { from?: string; to?: string } | boolean | undefined;
}

// Pagination state for UI
export interface PaginationState {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasMore: boolean;
}

// Sort state for UI
export interface SortState {
  field: string;
  direction: "asc" | "desc";
}

// Combined query state for list views
export interface ListQueryState {
  filters: FilterState;
  sort: SortState;
  pagination: PaginationState;
  search: string;
}

// Search params
export interface SearchParams {
  q: string;
  exact?: boolean;
  fields?: string[];
}

// Build query string from params, dropping empty values
export function toQueryString(params: Record<string, any> = {}): string {
  const sp = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === "" || value === "all") {
      continue;
    }
    if (Array.isArray(value)) {
      value.forEach(v => sp.append(key, String(v)));
    } else if (typeof value === "object" && value !== null) {
      // Handle nested objects (date ranges, etc.)
      for (const [subKey, subValue] of Object.entries(value)) {
        if (subValue !== undefined && subValue !== null && subValue !== "") {
          sp.append(`${key}[${subKey}]`, String(subValue));
        }
      }
    } else {
      sp.append(key, String(value));
    }
  }
  const s = sp.toString();
  return s ? `?${s}` : "";
}

// Parse query string into params object
export function parseQueryString(queryString: string): Record<string, any> {
  const params = new URLSearchParams(queryString);
  const result: Record<string, any> = {};
  
  for (const [key, value] of params.entries()) {
    // Handle array values (multiple same key)
    if (result[key] !== undefined) {
      if (!Array.isArray(result[key])) {
        result[key] = [result[key]];
      }
      result[key].push(value);
    } else {
      result[key] = value;
    }
  }
  return result;
}

// Build filter object for API calls
export function buildFilterParams(
  filters: FilterState,
  config: {
    selectFields?: string[];
    multiSelectFields?: string[];
    dateRangeFields?: string[];
    numberRangeFields?: string[];
    booleanFields?: string[];
    textFields?: string[];
  } = {}
): Record<string, any> {
  const params: Record<string, any> = {};
  
  for (const [key, value] of Object.entries(filters)) {
    if (value === undefined || value === null || value === "" || 
        (Array.isArray(value) && value.length === 0)) {
      continue;
    }

    // Multi-select fields (arrays)
    if (config.multiSelectFields?.includes(key) && Array.isArray(value)) {
      params[key] = value.join(",");
      continue;
    }

    // Date range fields
    if (config.dateRangeFields?.includes(key) && typeof value === "object") {
      const range = value as { from?: string; to?: string };
      if (range.from) params[`${key}[from]`] = range.from;
      if (range.to) params[`${key}[to]`] = range.to;
      continue;
    }

    // Number range fields
    if (config.numberRangeFields?.includes(key) && typeof value === "object") {
      const range = value as { min?: number; max?: number; gte?: number; lte?: number; gt?: number; lt?: number };
      Object.entries(range).forEach(([op, val]) => {
        if (val !== undefined && val !== null) {
          params[`${key}[${op}]`] = val;
        }
      });
      continue;
    }

    // Boolean fields
    if (config.booleanFields?.includes(key) && typeof value === "boolean") {
      params[key] = value;
      continue;
    }

    // Simple values
    params[key] = value;
  }

  return params;
}

// Parse sort string into sort state
export function parseSortString(sortString: string): { field: string; direction: "asc" | "desc" } | null {
  if (!sortString) return null;
  const desc = sortString.startsWith("-");
  const field = desc ? sortString.slice(1) : sortString;
  return { field, direction: desc ? "desc" : "asc" };
}

// Build sort string from sort state
export function buildSortString(field: string, direction: "asc" | "desc"): string {
  return direction === "desc" ? `-${field}` : field;
}

// Build multi-field sort string
export function buildMultiSortString(sorts: { field: string; direction: "asc" | "desc" }[]): string {
  return sorts.map(s => (s.direction === "desc" ? `-${s.field}` : s.field)).join(",");
}

// Parse multi-field sort string
export function parseMultiSortString(sortString: string): { field: string; direction: "asc" | "desc" }[] {
  if (!sortString) return [];
  return sortString.split(",").map(s => {
    const trimmed = s.trim();
    const desc = trimmed.startsWith("-");
    return { field: desc ? trimmed.slice(1) : trimmed, direction: desc ? "desc" : "asc" };
  });
}

// Default pagination config
export const DEFAULT_PAGINATION = {
  page: 1,
  limit: 10,
  maxLimit: 100,
};

// Default sort options
export const DEFAULT_SORT_OPTIONS: SortOption[] = [
  { field: "createdAt", label: "Created Date", directions: ["desc", "asc"], defaultDirection: "desc" },
  { field: "updatedAt", label: "Updated Date", directions: ["desc", "asc"], defaultDirection: "desc" },
  { field: "title", label: "Title", directions: ["asc", "desc"], defaultDirection: "asc" },
  { field: "name", label: "Name", directions: ["asc", "desc"], defaultDirection: "asc" },
];

// Common filter presets for date fields
export const DATE_PRESETS = [
  { value: "today", label: "Today" },
  { value: "thisWeek", label: "This Week" },
  { value: "thisMonth", label: "This Month" },
  { value: "lastWeek", label: "Last Week" },
  { value: "lastMonth", label: "Last Month" },
  { value: "nextWeek", label: "Next Week" },
  { value: "nextMonth", label: "Next Month" },
  { value: "upcoming", label: "Upcoming" },
  { value: "past", label: "Past" },
];

// Helper to build date range from preset
export function getDateRangeFromPreset(preset: string): { from?: string; to?: string } | null {
  const now = new Date();
  const startOfDay = (d: Date) => new Date(d.setHours(0, 0, 0, 0));
  const endOfDay = (d: Date) => new Date(d.setHours(23, 59, 59, 999));
  const formatDate = (d: Date) => d.toISOString().split("T")[0];

  const nowUtc = new Date();
  
  switch (preset) {
    case "today":
      return { from: formatDate(startOfDay(new Date(now))) };
    case "thisWeek": {
      const start = new Date(now);
      start.setDate(now.getDate() - now.getDay());
      start.setHours(0, 0, 0, 0);
      const end = new Date(start);
      end.setDate(start.getDate() + 6);
      end.setHours(23, 59, 59, 999);
      return { from: start.toISOString().split("T")[0], to: formatDate(endOfDay(new Date(end))) };
    }
    case "thisMonth": {
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
      return { from: formatDate(start), to: formatDate(end) };
    }
    case "lastWeek": {
      const start = new Date();
      start.setDate(now.getDate() - now.getDay() - 7);
      start.setHours(0, 0, 0, 0);
      const end = new Date(start);
      end.setDate(start.getDate() + 6);
      end.setHours(23, 59, 59, 999);
      return { from: formatDate(start), to: formatDate(end) };
    }
    case "lastMonth": {
      const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const end = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
      return { from: formatDate(start), to: formatDate(end) };
    }
    case "nextWeek": {
      const start = new Date();
      start.setDate(now.getDate() + (7 - now.getDay()));
      start.setHours(0, 0, 0, 0);
      const end = new Date(start);
      end.setDate(start.getDate() + 6);
      end.setHours(23, 59, 59, 999);
      return { from: formatDate(start), to: formatDate(end) };
    }
    case "nextMonth": {
      const start = new Date(now.getFullYear(), now.getMonth() + 1, 1);
      const end = new Date(now.getFullYear(), now.getMonth() + 2, 0, 23, 59, 59, 999);
      return { from: formatDate(start), to: formatDate(end) };
    }
    case "upcoming":
      return { from: new Date().toISOString().split("T")[0] };
    case "past": {
      const end = new Date();
      end.setHours(23, 59, 59, 999);
      return { to: formatDate(end) };
    }
    default:
      return null;
  }
}

// Default filter options for common fields
export const COMMON_FILTER_CONFIG = {
  selectFields: ["status", "type", "category", "role", "status"],
  multiSelectFields: ["category", "type", "tags", "status"],
  dateRangeFields: ["date", "createdAt", "updatedAt", "dateFrom", "dateTo"],
  numberRangeFields: ["price", "capacity", "amount", "age"],
  booleanFields: ["isPublic", "isActive", "featured", "published"],
  textFields: ["title", "name", "description", "search"],
};