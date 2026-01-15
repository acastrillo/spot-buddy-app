"use client"

import { useState, type ChangeEvent, type FormEvent } from "react"
import Link from "next/link"
import { Dumbbell, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

type FormStatus = "idle" | "submitting" | "success" | "error"

export default function BetaSignupPage() {
  const [status, setStatus] = useState<FormStatus>("idle")
  const [error, setError] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
  })

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)

    const payload = {
      firstName: formData.firstName.trim(),
      lastName: formData.lastName.trim(),
      email: formData.email.trim(),
    }

    if (!payload.firstName || !payload.email) {
      setStatus("error")
      setError("Please fill out all required fields.")
      return
    }

    setStatus("submitting")

    try {
      const response = await fetch("/api/beta-signup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const data = await response.json().catch(() => null)
        const message = data?.error || "Unable to submit right now. Please try again."
        throw new Error(message)
      }

      setStatus("success")
    } catch (submitError: any) {
      setStatus("error")
      setError(submitError?.message || "Unable to submit right now. Please try again.")
    }
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-background text-text-primary">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-24 left-10 h-64 w-64 rounded-full bg-primary/15 blur-3xl" />
        <div className="absolute bottom-0 right-0 h-72 w-72 rounded-full bg-accent/20 blur-3xl" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.08),_transparent_55%)]" />
      </div>

      <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-5xl flex-col gap-12 px-6 py-16 lg:flex-row lg:items-center">
        <div className="flex-1 space-y-6">
          <Link href="/" className="inline-flex items-center gap-3 text-text-secondary hover:text-text-primary">
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-primary/15">
              <Dumbbell className="h-6 w-6 text-primary" />
            </div>
            <span className="text-lg font-semibold tracking-wide">Kinex Fit</span>
          </Link>

          <div className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-surface/60 px-4 py-1 text-xs font-semibold uppercase tracking-[0.3em] text-text-secondary">
            <Sparkles className="h-4 w-4 text-primary" />
            Beta Signup
          </div>

          <h1 className="text-4xl font-semibold tracking-tight text-text-primary md:text-5xl">
            Be first to train with Kinex Fit.
          </h1>
          <p className="text-base text-text-secondary md:text-lg">
            We are opening a limited beta for athletes who want focused accountability, clear progress, and smarter
            training plans. Leave your details and we will reach out with early access.
          </p>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-border/60 bg-surface/80 p-4">
              <p className="text-sm font-semibold text-text-primary">Priority access</p>
              <p className="mt-2 text-sm text-text-secondary">
                Get invited first and help shape the beta with your feedback.
              </p>
            </div>
            <div className="rounded-2xl border border-border/60 bg-surface/80 p-4">
              <p className="text-sm font-semibold text-text-primary">Early features</p>
              <p className="mt-2 text-sm text-text-secondary">
                Try new training tools before they are released to everyone.
              </p>
            </div>
          </div>
        </div>

        <div className="w-full max-w-md">
          <Card className="border-border/70 bg-surface/90">
            <CardHeader>
              <CardTitle className="text-2xl">Request beta access</CardTitle>
              <CardDescription>Tell us where to send your invite.</CardDescription>
            </CardHeader>
            <CardContent>
              {status === "success" ? (
                <div className="space-y-4 text-center">
                  <div className="rounded-2xl border border-success/40 bg-success/10 px-4 py-3 text-sm text-success">
                    Thanks for signing up. We will be in touch soon.
                  </div>
                  <Button asChild className="w-full h-11 text-base font-semibold">
                    <Link href="/">Back to home</Link>
                  </Button>
                </div>
              ) : (
                <form className="space-y-4" onSubmit={handleSubmit}>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="firstName">First name</Label>
                      <Input
                        id="firstName"
                        name="firstName"
                        value={formData.firstName}
                        onChange={handleChange}
                        autoComplete="given-name"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="lastName">Last name (optional)</Label>
                      <Input
                        id="lastName"
                        name="lastName"
                        value={formData.lastName}
                        onChange={handleChange}
                        autoComplete="family-name"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      value={formData.email}
                      onChange={handleChange}
                      autoComplete="email"
                      required
                    />
                  </div>

                  {error && (
                    <div role="status" className="rounded-2xl border border-destructive/40 bg-destructive/10 px-4 py-2 text-sm text-destructive">
                      {error}
                    </div>
                  )}

                  <Button
                    type="submit"
                    className="w-full h-11 text-base font-semibold"
                    disabled={status === "submitting"}
                  >
                    {status === "submitting" ? "Submitting..." : "Join the beta"}
                  </Button>
                </form>
              )}
            </CardContent>
          </Card>
          <p className="mt-4 text-xs text-text-tertiary">
            We only use your email to contact you about beta access.
          </p>
        </div>
      </div>
    </div>
  )
}
