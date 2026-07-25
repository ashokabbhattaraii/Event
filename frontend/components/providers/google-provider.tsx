"use client";

import { GoogleOAuthProvider } from "@react-oauth/google";

/**
 * Wraps the app in Google's OAuth context so <GoogleLogin /> works.
 * If NEXT_PUBLIC_GOOGLE_CLIENT_ID is not set, it renders children as-is
 * (the Google button simply won't appear) instead of crashing.
 */
export function GoogleProvider({ children }: { children: React.ReactNode }) {
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

  if (!clientId) return <>{children}</>;

  return (
    <GoogleOAuthProvider clientId={clientId}>{children}</GoogleOAuthProvider>
  );
}
