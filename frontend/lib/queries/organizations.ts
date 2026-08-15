import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { organizationsApi, type Organization, type CoHostOrganization } from "../api/organizations";
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

export function useAddCoHostOrganization(eventId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (organizationId: string) => organizationsApi.addCoHost(eventId, organizationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: organizationKeys.coHosts(eventId) });
    },
  });
}

export function useRemoveCoHostOrganization(eventId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (orgId: string) => organizationsApi.removeCoHost(eventId, orgId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: organizationKeys.coHosts(eventId) });
    },
  });
}
