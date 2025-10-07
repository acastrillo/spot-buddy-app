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

    if (!error) {
      setAuthError(null);
      return;
    }

    switch (error) {
      case "AccessDenied":
        setAuthError("Access was denied. Please try again or contact support.");
        break;
      case "Configuration":
        setAuthError("Sign-in is not configured correctly. Please notify the team.");
        break;
      default:
        setAuthError("We couldn't complete the sign-in. Please try again.");
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
            Welcome to Spotter
          </CardTitle>
          <CardDescription className="text-[var(--text-secondary)] text-base">
            Track your fitness journey with precision
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6 pt-2">
          {authError && (
            <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-4 text-sm text-destructive text-center">
              {authError}
            </div>
          )}
          <div className="space-y-3 text-sm text-[var(--text-secondary)] text-center px-2">
            <p>Sign in to access your workouts, track progress, and sync across all your devices.</p>
          </div>
          <Button
            onClick={handleSignIn}
            className="w-full bg-[var(--primary)] hover:bg-[var(--primary)]/90 text-black font-semibold h-12 text-base transition-all"
            disabled={loading}
            size="lg"
          >
            {loading ? "Redirecting..." : "Continue with Spotter"}
          </Button>
          <p className="text-xs text-center text-[var(--text-tertiary)] pt-2">
            Secured by Amazon Cognito
          </p>
        </CardContent>
      </Card>
    </div>
  );
}