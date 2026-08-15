import {
  useMutation,
  useQuery,
  useQueryClient,
  keepPreviousData,
} from "@tanstack/react-query";
import { sessionsApi, type CreateSessionPayload, type SessionData } from "../api/sessions";
import { speakersApi, type CreateSpeakerPayload, type SpeakerData } from "../api/sessions";
import { useHasToken } from "../hooks/use-has-token";

export const sessionKeys = {
  byEvent: (eventId: string) => ["sessions", "byEvent", eventId] as const,
  detail: (id: string) => ["sessions", "detail", id] as const,
};

export const speakerKeys = {
  list: ["speakers", "list"] as const,
  detail: (id: string) => ["speakers", "detail", id] as const,
};

export function useEventSessions(eventId: string) {
  return useQuery({
    queryKey: sessionKeys.byEvent(eventId),
    queryFn: () => sessionsApi.getByEvent(eventId),
    enabled: useHasToken() && !!eventId,
    placeholderData: keepPreviousData,
  });
}

export function useSession(id: string) {
  return useQuery({
    queryKey: sessionKeys.detail(id),
    queryFn: () => sessionsApi.getById(id),
    enabled: useHasToken() && !!id,
  });
}

export function useCreateSession(eventId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateSessionPayload) => sessionsApi.create(eventId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: sessionKeys.byEvent(eventId) });
    },
  });
}

export function useUpdateSession(eventId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CreateSessionPayload> }) =>
      sessionsApi.update(eventId, id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: sessionKeys.byEvent(eventId) });
      queryClient.invalidateQueries({ queryKey: sessionKeys.detail(variables.id) });
    },
  });
}

export function useDeleteSession(eventId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => sessionsApi.delete(eventId, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: sessionKeys.byEvent(eventId) });
    },
  });
}

export function useOrganizationSpeakers() {
  return useQuery({
    queryKey: speakerKeys.list,
    queryFn: () => speakersApi.list(),
    enabled: useHasToken(),
  });
}

export function useSpeaker(id: string) {
  return useQuery({
    queryKey: speakerKeys.detail(id),
    queryFn: () => speakersApi.getById(id),
    enabled: useHasToken() && !!id,
  });
}

export function useCreateSpeaker() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateSpeakerPayload) => speakersApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: speakerKeys.list });
    },
  });
}

export function useUpdateSpeaker() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CreateSpeakerPayload> }) =>
      speakersApi.update(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: speakerKeys.list });
      queryClient.invalidateQueries({ queryKey: speakerKeys.detail(variables.id) });
    },
  });
}

export function useDeleteSpeaker() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => speakersApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: speakerKeys.list });
    },
  });
}