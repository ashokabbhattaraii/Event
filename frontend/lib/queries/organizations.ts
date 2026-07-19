import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { organizationsApi, type Organization } from "../api/organizations";

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
    enabled: typeof window !== "undefined" && !!localStorage.getItem("token"),
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
