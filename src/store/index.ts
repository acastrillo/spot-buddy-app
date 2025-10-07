"use client"

import { signIn as nextAuthSignIn, signOut as nextAuthSignOut, useSession } from "next-auth/react";

interface User {
  id: string;
  email: string;
  firstName?: string | null;
  lastName?: string | null;
  subscriptionTier?: string;
  subscriptionStatus?: string;
  ocrQuotaUsed?: number;
  ocrQuotaLimit?: number;
}

interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
  login: () => Promise<void>;
  logout: () => Promise<void>;
}

export const useAuthStore = (): AuthState => {
  const { data: session, status } = useSession();

  const user: User | null = session?.user?.email
    ? {
        id: ((session.user as unknown as { id?: string }).id ?? "") as string,
        email: session.user.email as string,
        firstName: (session.user as unknown as { firstName?: string | null }).firstName ?? null,
        lastName: (session.user as unknown as { lastName?: string | null }).lastName ?? null,
        subscriptionTier: (session.user as unknown as { subscriptionTier?: string }).subscriptionTier ?? "free",
        subscriptionStatus: (session.user as unknown as { subscriptionStatus?: string }).subscriptionStatus ?? "active",
        ocrQuotaUsed: (session.user as unknown as { ocrQuotaUsed?: number }).ocrQuotaUsed ?? 0,
        ocrQuotaLimit: (session.user as unknown as { ocrQuotaLimit?: number }).ocrQuotaLimit ?? 2,
      }
    : null;

  return {
    isAuthenticated: status === "authenticated",
    user,
    login: async () => {
      await nextAuthSignIn("cognito", { callbackUrl: "/" });
    },
    logout: async () => {
      await nextAuthSignOut({ callbackUrl: "/" });
    },
  };
};