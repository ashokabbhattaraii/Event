import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { eventsApi, type CreateEventPayload } from "../api/events";

export const eventKeys = {
  all: ["events"] as const,
  my: ["events", "my"] as const,
  detail: (id: string) => ["events", id] as const,
};

export function useAllEvents() {
  return useQuery({
    queryKey: eventKeys.all,
    queryFn: eventsApi.getAll,
  });
}

export function useMyEvents() {
  return useQuery({
    queryKey: eventKeys.my,
    queryFn: eventsApi.getMy,
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
