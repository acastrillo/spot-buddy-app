"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useAuthStore } from "@/store"
import { Header } from "@/components/layout/header"
import { MobileNav } from "@/components/layout/mobile-nav"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, Sparkles, ArrowRight, Info } from "lucide-react"
import Link from "next/link"

export default function GenerateWorkoutPage() {
  const router = useRouter()
  const { isAuthenticated, user } = useAuthStore()
  const [prompt, setPrompt] = useState("")
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [generatedWorkout, setGeneratedWorkout] = useState<any | null>(null)

  const examplePrompts = [
    "Upper body push workout, 45 minutes, dumbbells only",
    "Full body HIIT, 30 minutes, bodyweight exercises",
    "Leg day with squats and deadlifts, strength focus",
    "Core and abs workout, 20 minutes, no equipment",
    "Back and biceps, 60 minutes, hypertrophy training",
  ]

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      setError("Please enter a workout description")
      return
    }

    setIsGenerating(true)
    setError(null)
    setGeneratedWorkout(null)

    try {
      const response = await fetch('/api/ai/generate-workout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ prompt: prompt.trim() }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate workout')
      }

      setGeneratedWorkout(data.workout)
    } catch (err: any) {
      console.error('Error generating workout:', err)
      setError(err.message || 'Failed to generate workout. Please try again.')
    } finally {
      setIsGenerating(false)
    }
  }

  const handleViewWorkout = () => {
    if (generatedWorkout?.workoutId || generatedWorkout?.id) {
      router.push(`/workout/${generatedWorkout.workoutId || generatedWorkout.id}`)
    }
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle>Sign In Required</CardTitle>
            <CardDescription>
              Please sign in to generate AI-powered workouts
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/auth/login">
              <Button className="w-full">Sign In</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <>
      <Header />
      <main className="min-h-screen pb-20 md:pb-8">
        <div className="max-w-4xl mx-auto px-4 py-8">
          {/* Header Section */}
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-2">
              <Sparkles className="h-8 w-8 text-primary" />
              <h1 className="text-3xl font-bold text-text-primary">
                AI Workout Generator
              </h1>
            </div>
            <p className="text-text-secondary">
              Describe your perfect workout and let AI create a personalized training plan
            </p>
          </div>

          {/* Main Content */}
          <div className="grid gap-6">
            {!generatedWorkout ? (
              <>
                {/* Input Card */}
                <Card>
                  <CardHeader>
                    <CardTitle>Describe Your Workout</CardTitle>
                    <CardDescription>
                      Tell us what you want to work on, how much time you have, and any equipment preferences
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <Textarea
                      placeholder="Example: Upper body push workout, 45 minutes, dumbbells and barbell..."
                      value={prompt}
                      onChange={(e) => setPrompt(e.target.value)}
                      rows={4}
                      className="resize-none"
                      disabled={isGenerating}
                    />

                    {/* Character count */}
                    <div className="text-xs text-text-secondary text-right">
                      {prompt.length} / 500 characters
                    </div>

                    {/* Example Prompts */}
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-text-primary">
                        Example prompts:
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {examplePrompts.map((example, index) => (
                          <Button
                            key={index}
                            variant="outline"
                            size="sm"
                            onClick={() => setPrompt(example)}
                            disabled={isGenerating}
                            className="text-xs"
                          >
                            {example}
                          </Button>
                        ))}
                      </div>
                    </div>

                    {/* Info Alert */}
                    <Alert>
                      <Info className="h-4 w-4" />
                      <AlertDescription className="text-sm">
                        The AI will use your <Link href="/settings/training-profile" className="text-primary hover:underline">Training Profile</Link> to personalize exercise selection and weight suggestions.
                      </AlertDescription>
                    </Alert>

                    {/* Error Alert */}
                    {error && (
                      <Alert variant="destructive">
                        <AlertDescription>{error}</AlertDescription>
                      </Alert>
                    )}

                    {/* Generate Button */}
                    <Button
                      onClick={handleGenerate}
                      disabled={isGenerating || !prompt.trim()}
                      className="w-full"
                      size="lg"
                    >
                      {isGenerating ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Generating Workout...
                        </>
                      ) : (
                        <>
                          <Sparkles className="h-4 w-4 mr-2" />
                          Generate Workout
                        </>
                      )}
                    </Button>
                  </CardContent>
                </Card>

                {/* Feature Info Card */}
                <Card className="border-primary/20 bg-primary/5">
                  <CardHeader>
                    <CardTitle className="text-lg">How It Works</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 text-sm text-text-secondary">
                    <div className="flex gap-3">
                      <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">
                        1
                      </div>
                      <div>
                        <p className="font-medium text-text-primary">Describe Your Goal</p>
                        <p>Tell us what you want to train, how long, and what equipment you have</p>
                      </div>
                    </div>
                    <div className="flex gap-3">
                      <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">
                        2
                      </div>
                      <div>
                        <p className="font-medium text-text-primary">AI Creates Your Plan</p>
                        <p>Our AI analyzes your training profile and generates a complete workout</p>
                      </div>
                    </div>
                    <div className="flex gap-3">
                      <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">
                        3
                      </div>
                      <div>
                        <p className="font-medium text-text-primary">Review & Save</p>
                        <p>Preview your workout, make adjustments, and save it to your library</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </>
            ) : (
              /* Success Card */
              <Card className="border-primary bg-primary/5">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center">
                      <Sparkles className="h-6 w-6 text-primary-foreground" />
                    </div>
                    <div>
                      <CardTitle>Workout Generated!</CardTitle>
                      <CardDescription>
                        Your personalized workout has been created and saved to your library
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Workout Preview */}
                  <div className="bg-background rounded-lg p-4 space-y-2">
                    <h3 className="font-semibold text-lg text-text-primary">
                      {generatedWorkout.title}
                    </h3>
                    {generatedWorkout.description && (
                      <p className="text-sm text-text-secondary">
                        {generatedWorkout.description}
                      </p>
                    )}
                    <div className="flex items-center gap-4 text-sm text-text-secondary pt-2">
                      <span>{generatedWorkout.exercises?.length || 0} exercises</span>
                      {generatedWorkout.difficulty && (
                        <span className="capitalize">{generatedWorkout.difficulty}</span>
                      )}
                      {generatedWorkout.type && (
                        <span className="capitalize">{generatedWorkout.type}</span>
                      )}
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-3">
                    <Button onClick={handleViewWorkout} className="flex-1" size="lg">
                      View Workout
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </Button>
                    <Button
                      onClick={() => {
                        setGeneratedWorkout(null)
                        setPrompt("")
                      }}
                      variant="outline"
                      size="lg"
                    >
                      Generate Another
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </main>
      <MobileNav />
    </>
  )
}
