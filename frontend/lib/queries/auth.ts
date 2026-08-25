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
import { resetChatbotForUserChange } from "../stores/chatbot-store";

export const authKeys = {
  me: ["auth", "me"] as const,
};

export const roleRoutes: Record<string, string> = {
  admin: "/admin",
  org_admin: "/admin",
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
    // The chatbot store is a singleton created once at app load — it won't
    // notice a different account just logged in without this, so it'd keep
    // showing whichever user's chat history loaded first (see chatbot-store.ts).
    resetChatbotForUserChange();

    // Location is deliberately NOT captured here. Calling getCurrentPosition()
    // on this line raised the browser's native permission prompt immediately
    // before the router.push() below, and navigating away dismisses a pending
    // prompt — so the popup appeared and vanished on every single login, and
    // permission could never actually be granted. It's now requested from
    // <LocationPrompt> once the user has landed, from a real click, and only
    // when they haven't already decided (see components/app/location-prompt).
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
        resetChatbotForUserChange();
        queryClient.clear();
        router.push("/login");
      });
  };
}

// --- Email verification + password reset (report §7) ------------------------
export function useVerifyEmail() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (token: string) => authApi.verifyEmail(token),
    onSuccess: () => {
      // So AppShell's verification guard (which reads useCurrentUser())
      // sees the account as verified immediately, without needing a fresh
      // login — e.g. the verification link was opened in a new tab while
      // the app is still open, unverified, in another one.
      queryClient.invalidateQueries({ queryKey: authKeys.me });
    },
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

// --- GDPR: Data export & Account deletion ------------------------------------
export function useExportMyData() {
  return useMutation({
    mutationFn: () => authApi.exportMyData(),
  });
}

export function useDeleteMyAccount() {
  const queryClient = useQueryClient();
  const router = useRouter();
  return useMutation({
    mutationFn: () => authApi.deleteMyAccount(),
    onSuccess: () => {
      clearSession();
      resetChatbotForUserChange();
      queryClient.clear();
      router.push("/login");
    },
  });
}
