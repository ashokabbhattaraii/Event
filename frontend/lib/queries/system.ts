import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  systemAdminApi,
  type OrgRegisterPayload,
  type OrganizationListParams,
  type PendingOrganization,
} from "../api/system";
import { getErrorMessage } from "../errors";

export function useOrgRegister() {
  return useMutation({
    mutationFn: (data: OrgRegisterPayload) => systemAdminApi.orgRegister(data),
    onSuccess: () => toast.success("Application submitted! A system admin will review it."),
    onError: (error: unknown) => toast.error(getErrorMessage(error, "Failed to submit organization application.")),
  });
}

export function usePendingOrganizations(params: OrganizationListParams = {}) {
  return useQuery({
    queryKey: ["system", "orgs", params],
    queryFn: () => systemAdminApi.listOrganizations(params),
    retry: false,
    placeholderData: keepPreviousData,
  });
}

export function useApproveOrganization() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => systemAdminApi.approveOrganization(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["system", "orgs"] });
      toast.success("Organization approved!");
    },
    onError: (error: unknown) => toast.error(getErrorMessage(error, "Failed to approve organization.")),
  });
}

export function useRejectOrganization() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      systemAdminApi.rejectOrganization(id, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["system", "orgs"] });
      toast.success("Organization rejected.");
    },
    onError: (error: unknown) => toast.error(getErrorMessage(error, "Failed to reject organization.")),
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
      toast.success("Organization updated.");
    },
    onError: (error: unknown) => toast.error(getErrorMessage(error, "Failed to update organization.")),
  });
}

export type { PendingOrganization };
