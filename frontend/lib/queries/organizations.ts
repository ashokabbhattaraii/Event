import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  organizationsApi,
  coHostInvitationsApi,
  type Organization,
  type CoHostOrganization,
} from "../api/organizations";
import { useHasToken } from "../hooks/use-has-token";

export const organizationKeys = {
  list: ["organizations", "list"] as const,
  mine: ["organizations", "mine"] as const,
  coHosts: (eventId: string) => ["organizations", "co-hosts", eventId] as const,
};

export function useOrganizations() {
  return useQuery({
    queryKey: organizationKeys.list,
    queryFn: organizationsApi.list,
  });
}

export function useMyOrganization() {
  return useQuery({
    queryKey: organizationKeys.mine,
    queryFn: organizationsApi.getMine,
    retry: false,
    enabled: useHasToken(),
  });
}

export function useUpdateMyOrganization() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<Pick<Organization, "name" | "status">>) =>
      organizationsApi.updateMine(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: organizationKeys.mine });
    },
  });
}

// Co-host queries
export function useCoHostOrganizations(eventId: string) {
  return useQuery({
    queryKey: organizationKeys.coHosts(eventId),
    queryFn: () => organizationsApi.listCoHosts(eventId),
    enabled: !!eventId,
  });
}

export function useRemoveCoHostOrganization(eventId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (orgId: string) => organizationsApi.removeCoHost(eventId, orgId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: organizationKeys.coHosts(eventId) });
      queryClient.invalidateQueries({ queryKey: invitationKeys.forEvent(eventId) });
    },
  });
}

// --- Co-host invitations ----------------------------------------------------

export const invitationKeys = {
  forEvent: (eventId: string) => ["co-host-invitations", "event", eventId] as const,
  mine: ["co-host-invitations", "mine"] as const,
};

// Invitations this event has sent (pending / accepted / declined / cancelled).
export function useEventInvitations(eventId: string) {
  return useQuery({
    queryKey: invitationKeys.forEvent(eventId),
    queryFn: () => coHostInvitationsApi.listForEvent(eventId),
    enabled: !!eventId,
  });
}

export function useInviteCoHost(eventId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ organizationId, message }: { organizationId: string; message: string }) =>
      coHostInvitationsApi.invite(eventId, organizationId, message),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: invitationKeys.forEvent(eventId) });
    },
  });
}

export function useCancelInvitation(eventId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (invitationId: string) => coHostInvitationsApi.cancel(eventId, invitationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: invitationKeys.forEvent(eventId) });
    },
  });
}

// The caller's own organization's inbox, across every event.
export function useMyInvitations() {
  return useQuery({
    queryKey: invitationKeys.mine,
    queryFn: coHostInvitationsApi.listMine,
    enabled: useHasToken(),
  });
}

export function useRespondToInvitation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      invitationId,
      action,
      message,
    }: {
      invitationId: string;
      action: "accept" | "decline";
      message?: string;
    }) => coHostInvitationsApi.respond(invitationId, action, message),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: invitationKeys.mine });
      // Accepting creates a co-host link, so any open co-host list is stale.
      queryClient.invalidateQueries({ queryKey: ["organizations", "co-hosts"] });
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });
}
