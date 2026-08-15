import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { usersApi, type CreateUserPayload, type UserListParams } from "../api/users";
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

export function useCreateUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateUserPayload) => usersApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: userKeys.list });
    },
  });
}

// Settings mutations: after a profile/password update the cached /auth/me
// user and the localStorage copy both need refreshing so the sidebar name
// and the "googleAccount" flag stay current.
export function useUpdateMyProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (name: string) => usersApi.updateMyProfile(name),
    onSuccess: (data) => {
      queryClient.setQueryData(["auth", "me"], data);
      const stored = localStorage.getItem("user");
      if (stored) {
        localStorage.setItem(
          "user",
          JSON.stringify({ ...JSON.parse(stored), name: data.user.name })
        );
      }
    },
  });
}

export function useUpdateMyPassword() {
  return useMutation({
    mutationFn: (payload: { currentPassword: string; newPassword: string }) =>
      usersApi.updateMyPassword(payload),
  });
}

export function useUpdateReminderPreference() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (reminderEmail: boolean) => usersApi.updateReminderPreference(reminderEmail),
    onSuccess: (data) => {
      queryClient.setQueryData(["auth", "me"], (old: any) =>
        old ? { ...old, user: { ...old.user, reminderEmail: data.reminderEmail } } : old
      );
      const stored = localStorage.getItem("user");
      if (stored) {
        localStorage.setItem(
          "user",
          JSON.stringify({ ...JSON.parse(stored), reminderEmail: data.reminderEmail })
        );
      }
    },
  });
}
