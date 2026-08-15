import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { iamApi } from "../api/iam";
import { useHasToken } from "../hooks/use-has-token";

export const iamKeys = {
  roles: ["iam", "roles"] as const,
  permissions: ["iam", "permissions"] as const,
};

// Role + permission catalog. System admins manage this; tenant admins view.
export function useRoles() {
  return useQuery({
    queryKey: iamKeys.roles,
    queryFn: iamApi.roles,
    enabled: useHasToken(),
    staleTime: 30_000,
  });
}

export function usePermissions() {
  return useQuery({
    queryKey: iamKeys.permissions,
    queryFn: iamApi.permissions,
    enabled: useHasToken(),
    staleTime: 60_000,
  });
}

export function useUpdateRolePermissions() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, permissions }: { id: string; permissions: string[] }) =>
      iamApi.updateRole(id, permissions),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: iamKeys.roles });
    },
  });
}
