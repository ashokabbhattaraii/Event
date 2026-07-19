import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { usersApi } from "../api/users";

export const userKeys = {
  list: ["users", "list"] as const,
  stats: ["users", "stats"] as const,
};

const enabled = typeof window !== "undefined" && !!localStorage.getItem("token");

export function useOrgUsers() {
  return useQuery({ queryKey: userKeys.list, queryFn: usersApi.list, enabled });
}

export function useOrgStats() {
  return useQuery({ queryKey: userKeys.stats, queryFn: usersApi.stats, enabled });
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
