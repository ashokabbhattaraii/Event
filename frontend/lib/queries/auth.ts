import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import {
  authApi,
  type AuthResponse,
  type LoginPayload,
  type RegisterPayload,
} from "../api/auth";
import { captureAndSaveLocation } from "../api/location";

export const authKeys = {
  me: ["auth", "me"] as const,
};

const roleRoutes: Record<string, string> = {
  admin: "/admin",
  organizer: "/organizer",
  attendee: "/attendee",
};

export function useCurrentUser() {
  return useQuery({
    queryKey: authKeys.me,
    queryFn: authApi.getMe,
    retry: false,
    enabled: typeof window !== "undefined" && !!localStorage.getItem("token"),
  });
}

// Shared success handler: persist the session and route by role.
function useAuthSuccess() {
  const queryClient = useQueryClient();
  const router = useRouter();

  return (data: AuthResponse) => {
    localStorage.setItem("token", data.token);
    localStorage.setItem("user", JSON.stringify(data.user));
    queryClient.setQueryData(authKeys.me, { user: data.user });

    // Capture location (with permission) in the background — the token is now
    // stored, so the authenticated PATCH will carry it. Never blocks redirect.
    captureAndSaveLocation()
      .then((loc) => {
        if (loc) queryClient.invalidateQueries({ queryKey: ["recommendations"] });
      })
      .catch(() => {});

    router.push(roleRoutes[data.user.role] || "/attendee");
  };
}

export function useLogin() {
  const onSuccess = useAuthSuccess();
  return useMutation({
    mutationFn: (data: LoginPayload) => authApi.login(data),
    onSuccess,
  });
}

export function useRegister() {
  const onSuccess = useAuthSuccess();
  return useMutation({
    mutationFn: (data: RegisterPayload) => authApi.register(data),
    onSuccess,
  });
}

export function useGoogleLogin() {
  const onSuccess = useAuthSuccess();
  return useMutation({
    mutationFn: (credential: string) => authApi.googleLogin(credential),
    onSuccess,
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
