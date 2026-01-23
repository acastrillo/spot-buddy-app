"use client"

import { useState, type ChangeEvent, type FormEvent } from "react"
import { useRouter } from "next/navigation"
import { Dumbbell, ArrowRight, CheckCircle2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

type FormStatus = "idle" | "submitting" | "success" | "error"

export default function BetaJoinPage() {
  const router = useRouter()
  const [status, setStatus] = useState<FormStatus>("idle")
  const [email, setEmail] = useState("")
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)

    const trimmedEmail = email.trim()
    if (!trimmedEmail) {
      setStatus("error")
      setError("Please enter your email")
      return
    }

    // Simple email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(trimmedEmail)) {
      setStatus("error")
      setError("Please enter a valid email")
      return
    }

    setStatus("submitting")

    // Store email in sessionStorage and redirect to full signup
    try {
      sessionStorage.setItem("beta_email", trimmedEmail)

      // Small delay for better UX
      await new Promise(resolve => setTimeout(resolve, 500))

      setStatus("success")

      // Redirect after showing success state
      setTimeout(() => {
        router.push("/beta-signup")
      }, 1000)
    } catch (e) {
      setStatus("error")
      setError("Something went wrong. Please try again.")
    }
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-background text-text-primary">
      {/* Background effects */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-24 left-10 h-64 w-64 rounded-full bg-primary/20 blur-3xl" />
        <div className="absolute bottom-0 right-0 h-72 w-72 rounded-full bg-accent/25 blur-3xl" />
      </div>

      {/* Content */}
      <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-md flex-col items-center justify-center px-6 py-12">
        {/* Logo */}
        <div className="mb-8 flex h-16 w-16 items-center justify-center rounded-full bg-primary/15">
          <Dumbbell className="h-8 w-8 text-primary" />
        </div>

        {/* Headline */}
        <h1 className="mb-3 text-center text-3xl font-semibold tracking-tight text-text-primary sm:text-4xl">
          Join Kinex Fit Beta
        </h1>

        <p className="mb-8 text-center text-base text-text-secondary">
          AI-powered workout tracking. Limited spots available.
        </p>

        {/* Benefits list */}
        <div className="mb-8 w-full space-y-3">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
            <div>
              <p className="text-sm font-medium text-text-primary">Free Elite Access</p>
              <p className="text-xs text-text-secondary">Full features during beta period</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
            <div>
              <p className="text-sm font-medium text-text-primary">Founding Member Status</p>
              <p className="text-xs text-text-secondary">Lifetime discounts for active testers</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
            <div>
              <p className="text-sm font-medium text-text-primary">Shape the Future</p>
              <p className="text-xs text-text-secondary">Your feedback drives development</p>
            </div>
          </div>
        </div>

        {status === "success" ? (
          <div className="w-full space-y-4 text-center">
            <div className="rounded-2xl border border-success/40 bg-success/10 px-4 py-3 text-sm text-success">
              Redirecting you to complete signup...
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="w-full space-y-4">
            <div className="space-y-2">
              <Input
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
                className="h-12 text-base"
                autoComplete="email"
                autoFocus
                disabled={status === "submitting"}
              />
            </div>

            {error && (
              <div className="rounded-2xl border border-destructive/40 bg-destructive/10 px-4 py-2 text-sm text-destructive">
                {error}
              </div>
            )}

            <Button
              type="submit"
              className="h-12 w-full text-base font-semibold"
              disabled={status === "submitting"}
            >
              {status === "submitting" ? (
                "Processing..."
              ) : (
                <>
                  Continue to Beta Signup
                  <ArrowRight className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
          </form>
        )}

        {/* Footer */}
        <p className="mt-8 text-center text-xs text-text-tertiary">
          Beta starts February 1st, 2025. Limited to 30-40 testers.
        </p>
      </div>
    </div>
  )
}
