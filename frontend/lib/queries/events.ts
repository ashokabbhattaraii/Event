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

export const eventKeys = {
  all: ["events"] as const,
  allList: (params: EventListParams) => ["events", "list", params] as const,
  my: ["events", "my"] as const,
  myList: (params: EventListParams) => ["events", "my", params] as const,
  detail: (id: string) => ["events", id] as const,
};

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
