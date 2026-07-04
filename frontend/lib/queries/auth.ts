import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { authApi, type LoginPayload, type RegisterPayload } from "../api/auth";

export const authKeys = {
  me: ["auth", "me"] as const,
};

export function useCurrentUser() {
  return useQuery({
    queryKey: authKeys.me,
    queryFn: authApi.getMe,
    retry: false,
    enabled: typeof window !== "undefined" && !!localStorage.getItem("token"),
  });
}

export function useLogin() {
  const queryClient = useQueryClient();
  const router = useRouter();

  return useMutation({
    mutationFn: (data: LoginPayload) => authApi.login(data),
    onSuccess: (data) => {
      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));
      queryClient.setQueryData(authKeys.me, { user: data.user });

      const roleRoutes: Record<string, string> = {
        admin: "/admin",
        organizer: "/organizer",
        attendee: "/attendee",
      };
      router.push(roleRoutes[data.user.role] || "/attendee");
    },
  });
}

export function useRegister() {
  const queryClient = useQueryClient();
  const router = useRouter();

  return useMutation({
    mutationFn: (data: RegisterPayload) => authApi.register(data),
    onSuccess: (data) => {
      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));
      queryClient.setQueryData(authKeys.me, { user: data.user });

      const roleRoutes: Record<string, string> = {
        admin: "/admin",
        organizer: "/organizer",
        attendee: "/attendee",
      };
      router.push(roleRoutes[data.user.role] || "/attendee");
    },
  });
}

export function useLogout() {
  const queryClient = useQueryClient();
  const router = useRouter();

  return () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    queryClient.clear();
    router.push("/login");
  };
}
