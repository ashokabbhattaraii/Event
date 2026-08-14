import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { usersApi, type UserListParams } from "../api/users";
import { useHasToken } from "../hooks/use-has-token";

export const userKeys = {
  list: ["users", "list"] as const,
  listParams: (params: UserListParams) => ["users", "list", params] as const,
  stats: ["users", "stats"] as const,
};

export function useOrgUsers(params: UserListParams = {}) {
  return useQuery({
    queryKey: userKeys.listParams(params),
    queryFn: () => usersApi.list(params),
    enabled: useHasToken(),
    placeholderData: keepPreviousData,
  });
}

export function useOrgStats() {
  return useQuery({ queryKey: userKeys.stats, queryFn: usersApi.stats, enabled: useHasToken() });
}

export function useUpdateUserRole() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, role }: { id: string; role: string }) =>
      usersApi.updateRole(id, role),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: userKeys.list });
    },
  });
}
