import { useState } from "react";
import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import {
  eventsApi,
  type CreateEventPayload,
  type EventListParams,
} from "../api/events";
import type { AdvancedFilterParams, SortState, PaginationState } from "../api/list";

export const eventKeys = {
  all: ["events"] as const,
  allList: (params: EventListParams) => ["events", "list", params] as const,
  my: ["events", "my"] as const,
  myList: (params: EventListParams) => ["events", "my", params] as const,
  detail: (id: string) => ["events", id] as const,
};

// Basic event list queries (backward compatible)
export function useAllEvents(params: EventListParams = {}) {
  return useQuery({
    queryKey: eventKeys.allList(params),
    queryFn: () => eventsApi.getAll(params),
    placeholderData: keepPreviousData,
  });
}

export function useMyEvents(params: EventListParams = {}) {
  return useQuery({
    queryKey: eventKeys.myList(params),
    queryFn: () => eventsApi.getMy(params),
    placeholderData: keepPreviousData,
  });
}

export function useOrgEvents(params: EventListParams = {}) {
  return useQuery({
    queryKey: ["events", "org", params] as const,
    queryFn: () => eventsApi.getOrg(params),
    placeholderData: keepPreviousData,
  });
}

export function useEvent(id: string) {
  return useQuery({
    queryKey: eventKeys.detail(id),
    queryFn: () => eventsApi.getById(id),
    enabled: !!id,
  });
}

// Advanced event list queries with full filter/sort/pagination support
export function useAdvancedEvents(params: AdvancedFilterParams = {}) {
  return useQuery({
    queryKey: ["events", "advanced", params] as const,
    queryFn: () => eventsApi.getAll(params),
    placeholderData: keepPreviousData,
  });
}

export function useAdvancedMyEvents(params: AdvancedFilterParams = {}) {
  return useQuery({
    queryKey: ["events", "my", "advanced", params] as const,
    queryFn: () => eventsApi.getMy(params),
    placeholderData: keepPreviousData,
  });
}

export function useAdvancedOrgEvents(params: AdvancedFilterParams = {}) {
  return useQuery({
    queryKey: ["events", "org", "advanced", params] as const,
    queryFn: () => eventsApi.getOrg(params),
    placeholderData: keepPreviousData,
  });
}

// Hook for managing list query state (pagination, sorting, filtering)
export function useEventListState(initialState = {}) {
  // This would typically use useState or a state management solution
  // For now, we'll provide a hook that returns the state and helpers
  // The actual state management would be done by the component using this hook
  return {
    // Placeholder for state management
  };
}

// Mutation hooks
export function useCreateEvent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateEventPayload) => eventsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: eventKeys.my });
      queryClient.invalidateQueries({ queryKey: eventKeys.all });
    },
  });
}

export function useUpdateEvent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CreateEventPayload> }) =>
      eventsApi.update(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: eventKeys.my });
      queryClient.invalidateQueries({ queryKey: eventKeys.detail(variables.id) });
    },
  });
}

export function useDeleteEvent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => eventsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: eventKeys.my });
      queryClient.invalidateQueries({ queryKey: eventKeys.all });
    },
  });
}

// Advanced mutation hooks
export function useBulkUpdateEvents() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ ids, data }: { ids: string[]; data: Partial<any> }) => {
      // This would need a backend endpoint for bulk updates
      // For now, we'll do sequential updates
      const results = [];
      for (const id of ids) {
        const res = await fetch(`/api/events/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });
        if (!res.ok) throw new Error(`Failed to update ${id}`);
        results.push(await res.json());
      }
      return results;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: eventKeys.my });
      queryClient.invalidateQueries({ queryKey: eventKeys.all });
    },
  });
}

export function useBulkDeleteEvents() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (ids: string[]) => {
      const results = [];
      for (const id of ids) {
        const res = await fetch(`/api/events/${id}`, { method: "DELETE" });
        if (!res.ok) throw new Error(`Failed to delete ${id}`);
        results.push(await res.json());
      }
      return results;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: eventKeys.my });
      queryClient.invalidateQueries({ queryKey: eventKeys.all });
    },
  });
}

// Hook for managing list query state with URL sync
export function useEventListQuery(defaultParams: EventListParams = {}) {
  // This is a more advanced hook that syncs state with URL
  // For now, we'll provide the basic structure
  const [params, setParams] = useState<EventListParams>(defaultParams);
  
  return {
    params,
    setParams,
    // Helper methods for common operations
    setPage: (page: number) => setParams(p => ({ ...p, page })),
    setLimit: (limit: number) => setParams(p => ({ ...p, limit, page: 1 })),
    setSearch: (search: string) => setParams(p => ({ ...p, search, page: 1 })),
    setSort: (sort: string) => setParams(p => ({ ...p, sort, page: 1 })),
    setFilter: (key: string, value: string | string[]) => 
      setParams(p => ({ ...p, [key]: value, page: 1 })),
    clearFilters: () => setParams(p => ({ 
      ...p, 
      page: 1,
      // Keep sort and limit, clear filters
      status: undefined,
      category: undefined,
      type: undefined,
      search: undefined,
    })),
  };
}
