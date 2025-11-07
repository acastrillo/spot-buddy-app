"use client"

import { useCallback, useEffect, useState } from "react";
import { useAuthStore } from "@/store";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dumbbell } from "lucide-react";

export function Login() {
  const { login } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const params = new URLSearchParams(window.location.search);
    const error = params.get("error");
    const errorDescription = params.get("error_description");

    if (!error) {
      setAuthError(null);
      return;
    }

    // Log for debugging (visible in browser console)
    console.error("Auth error:", error, errorDescription);

    switch (error) {
      case "AccessDenied":
        setAuthError("Access was denied. This may be a temporary issue. Please try again.");
        break;
      case "Configuration":
        setAuthError("Sign-in configuration issue. Please clear your cookies and try again.");
        break;
      case "OAuthSignin":
        setAuthError("OAuth sign-in failed. Please try again or use a different browser.");
        break;
      case "OAuthCallback":
        setAuthError("OAuth callback failed. The session may have expired. Please try again.");
        break;
      case "OAuthCreateAccount":
        setAuthError("Could not create account. Please contact support.");
        break;
      case "EmailCreateAccount":
        setAuthError("Could not create account with this email. Please contact support.");
        break;
      case "Callback":
        setAuthError("Callback error. Please clear your cookies and try again.");
        break;
      case "OAuthAccountNotLinked":
        setAuthError("This email is already associated with another account.");
        break;
      case "EmailSignin":
        setAuthError("Email sign-in failed. Please check your email and try again.");
        break;
      case "CredentialsSignin":
        setAuthError("Credentials sign-in failed. Please check your credentials.");
        break;
      case "SessionRequired":
        setAuthError("Session required. Please sign in again.");
        break;
      default:
        setAuthError(
          errorDescription
            ? `Sign-in error: ${errorDescription}`
            : "We couldn't complete the sign-in. Please try again."
        );
        break;
    }
  }, []);

  const handleSignIn = useCallback(async () => {
    try {
      setLoading(true);
      await login();
    } finally {
      setLoading(false);
    }
  }, [login]);

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[var(--background)]">
      <Card className="w-full max-w-md bg-[var(--surface)] border-[var(--border)]">
        <CardHeader className="space-y-1 text-center">
          <div className="flex justify-center mb-4">
            <div className="p-4 rounded-full bg-[var(--primary)]/10">
              <Dumbbell className="h-12 w-12 text-[var(--primary)]" />
            </div>
          </div>
          <CardTitle className="text-3xl font-bold text-[var(--text-primary)]">
            Welcome to Spot Buddy
          </CardTitle>
          <CardDescription className="text-[var(--text-secondary)] text-base">
            Your fitness accountability partner
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6 pt-2">
          {authError && (
            <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-4 text-sm text-destructive text-center">
              {authError}
            </div>
          )}
          <div className="space-y-3 text-sm text-[var(--text-secondary)] text-center px-2">
            <p>Track workouts, monitor progress, and sync across all your devices.</p>
          </div>

          {/* Sign Up Button - Primary CTA */}
          <div className="space-y-3">
            <Button
              onClick={handleSignIn}
              className="w-full bg-[var(--primary)] hover:bg-[var(--primary)]/90 text-black font-semibold h-12 text-base transition-all shadow-lg"
              disabled={loading}
              size="lg"
            >
              {loading ? "Redirecting..." : "Sign Up with Google"}
            </Button>

            {/* Divider */}
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-[var(--border)]" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-[var(--surface)] px-2 text-[var(--text-tertiary)]">
                  Already have an account?
                </span>
              </div>
            </div>

            {/* Sign In Button - Secondary */}
            <Button
              onClick={handleSignIn}
              variant="outline"
              className="w-full border-2 border-[var(--border)] hover:bg-[var(--surface-elevated)] text-[var(--text-primary)] font-semibold h-12 text-base transition-all"
              disabled={loading}
              size="lg"
            >
              {loading ? "Redirecting..." : "Sign In with Google"}
            </Button>
          </div>

          <p className="text-xs text-center text-[var(--text-tertiary)] pt-2">
            Secured by AWS Cognito • By continuing, you agree to our Terms of Service
          </p>
        </CardContent>
      </Card>
    </div>
  );
}