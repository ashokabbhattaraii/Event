import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import {
  authApi,
  storeSession,
  type AuthResponse,
  type LoginPayload,
  type RegisterPayload,
} from "../api/auth";
import { clearSession } from "../api/client";
import { captureAndSaveLocation } from "../api/location";
import { useHasToken } from "../hooks/use-has-token";

export const authKeys = {
  me: ["auth", "me"] as const,
};

const roleRoutes: Record<string, string> = {
  admin: "/admin",
  organizer: "/organizer",
  attendee: "/dashboard",
};

export function useCurrentUser() {
  return useQuery({
    queryKey: authKeys.me,
    queryFn: authApi.getMe,
    retry: false,
    enabled: useHasToken(),
  });
}

// Shared success handler: persist the session and route by role.
function useAuthSuccess() {
  const queryClient = useQueryClient();
  const router = useRouter();

  return (data: AuthResponse) => {
    storeSession(data);
    localStorage.setItem("user", JSON.stringify(data.user));
    queryClient.setQueryData(authKeys.me, { user: data.user });

    // Capture location (with permission) in the background — the token is now
    // stored, so the authenticated PATCH will carry it. Never blocks redirect.
    captureAndSaveLocation()
      .then((loc) => {
        if (loc) queryClient.invalidateQueries({ queryKey: ["recommendations"] });
      })
      .catch(() => {});

    router.push(roleRoutes[data.user.role] || "/dashboard");
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

  // Revoke the server-side session (fire-and-forget) then drop local state.
  // Revoking is best-effort: the client clears its tokens regardless so the
  // user is never stranded on a page that thinks it's still logged in.
  return () => {
    authApi
      .logout()
      .catch(() => {})
      .finally(() => {
        clearSession();
        queryClient.clear();
        router.push("/login");
      });
  };
}

// --- Email verification + password reset (report §7) ------------------------
export function useVerifyEmail() {
  return useMutation({
    mutationFn: (token: string) => authApi.verifyEmail(token),
  });
}

export function useResendVerification() {
  return useMutation({
    mutationFn: () => authApi.resendVerification(),
  });
}

export function useForgotPassword() {
  return useMutation({
    mutationFn: (email: string) => authApi.forgotPassword(email),
  });
}

export function useResetPassword() {
  return useMutation({
    mutationFn: ({ token, password }: { token: string; password: string }) =>
      authApi.resetPassword(token, password),
  });
}

// --- Active sessions management ---------------------------------------------
export function useSessions() {
  return useQuery({
    queryKey: ["auth", "sessions"],
    queryFn: authApi.listSessions,
    retry: false,
    enabled: useHasToken(),
  });
}

export function useRevokeSession() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => authApi.revokeSession(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["auth", "sessions"] });
    },
  });
}
