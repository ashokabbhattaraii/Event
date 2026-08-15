import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  systemAdminApi,
  type OrgRegisterPayload,
  type PendingOrganization,
} from "../api/system";

export function useOrgRegister() {
  return useMutation({
    mutationFn: (data: OrgRegisterPayload) => systemAdminApi.orgRegister(data),
  });
}

export function usePendingOrganizations(status: string = "pending") {
  return useQuery({
    queryKey: ["system", "orgs", status],
    queryFn: () => systemAdminApi.listOrganizations(status),
    retry: false,
  });
}

export function useApproveOrganization() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => systemAdminApi.approveOrganization(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["system", "orgs"] });
    },
  });
}

export function useRejectOrganization() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      systemAdminApi.rejectOrganization(id, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["system", "orgs"] });
    },
  });
}

export function useUpdateOrganization() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      ...data
    }: { id: string; name?: string; status?: "active" | "suspended" }) =>
      systemAdminApi.updateOrganization(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["system", "orgs"] });
    },
  });
}

export type { PendingOrganization };
