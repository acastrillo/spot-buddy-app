"use client"

import { signIn as nextAuthSignIn, signOut as nextAuthSignOut, useSession } from "next-auth/react";

// It's a good practice to define the shape of the user object from your session
interface SessionUser {
  id?: string;
  email?: string;
  firstName?: string | null;
  lastName?: string | null;
  subscriptionTier?: string;
  subscriptionStatus?: string;
  ocrQuotaUsed?: number;
  ocrQuotaLimit?: number;
}

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
  isLoading: boolean; // Add isLoading state
  user: User | null;
  login: () => Promise<void>;
  logout: () => Promise<void>;
}

export const useAuthStore = (): AuthState => {
  const { data: session, status } = useSession();

  // Cast the session user once to the defined type for safer access
  const sessionUser = session?.user as SessionUser | null;

  const user: User | null = sessionUser?.email && sessionUser?.id
    ? {
        id: sessionUser.id,
        email: sessionUser.email,
        firstName: sessionUser.firstName ?? null,
        lastName: sessionUser.lastName ?? null,
        subscriptionTier: sessionUser.subscriptionTier ?? "free",
        subscriptionStatus: sessionUser.subscriptionStatus ?? "active",
        ocrQuotaUsed: sessionUser.ocrQuotaUsed ?? 0,
        ocrQuotaLimit: sessionUser.ocrQuotaLimit ?? 2,
      }
    : null;

  return {
    isAuthenticated: status === "authenticated",
    isLoading: status === "loading", // Expose the loading state
    user,
    login: async () => {
      await nextAuthSignIn("cognito", { callbackUrl: "/" });
    },
    logout: async () => {
      await nextAuthSignOut({ callbackUrl: "/" });
    },
  };
};