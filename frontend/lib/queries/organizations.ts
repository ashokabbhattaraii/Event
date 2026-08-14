import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { organizationsApi, type Organization } from "../api/organizations";
import { useHasToken } from "../hooks/use-has-token";

export const organizationKeys = {
  list: ["organizations", "list"] as const,
  mine: ["organizations", "mine"] as const,
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
