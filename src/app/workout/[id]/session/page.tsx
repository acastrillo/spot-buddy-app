"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter, useParams } from "next/navigation"
import { useAuthStore } from "@/store"
import { Login } from "@/components/auth/login"
import { Header } from "@/components/layout/header"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { WorkoutTimer } from "@/components/timer/workout-timer"
import AMRAPSessionView from "./amrap-session-view"
import {
  Timer,
  Sparkles,
  CheckCircle,
  Clock,
  Trophy,
  Loader2,
  X,
  ChevronLeft,
} from "lucide-react"
import { cn } from "@/lib/utils"

interface Exercise {
  id: string
  name: string
  sets: number
  reps: string | number
  weight?: string
  restSeconds?: number
  notes?: string
  setDetails?: Array<{
    id?: string
    reps?: string | number
    weight?: string
  }>
}

interface WorkoutCard {
  id: string
  exerciseId: string
  exerciseName: string
  exerciseNumber: number
  setNumber: number
  totalSets: number
  reps: string | number
  weight?: string
  restSeconds?: number
  notes?: string
  isLastSetOfExercise: boolean
}

interface Workout {
  id: string
  title: string
  description: string
  exercises: Exercise[]
  totalDuration: number
  difficulty: string
  workoutType?: string
  structure?: {
    timeLimit?: number
    rounds?: number
    timePerRound?: number
    totalTime?: number
    pattern?: string
  }
  timerConfig?: {
    params: any
    aiGenerated?: boolean
    reason?: string
  }
}

// Helper function to flatten exercises into workout cards (circuit/round-based)
// For workouts with multiple sets, this creates cards in round order:
// Round 1: Exercise 1, Exercise 2, Exercise 3, Exercise 4
// Round 2: Exercise 1, Exercise 2, Exercise 3, Exercise 4
// etc.
function flattenExercisesToCards(exercises: Exercise[]): WorkoutCard[] {
  const cards: WorkoutCard[] = []

  if (exercises.length === 0) return cards

  // Find the maximum number of sets across all exercises
  const maxSets = Math.max(
    ...exercises.map(ex =>
      ex.setDetails && ex.setDetails.length > 0 ? ex.setDetails.length : ex.sets
    )
  )

  // Build cards by round (set number) first, then by exercise
  for (let setIdx = 0; setIdx < maxSets; setIdx++) {
    exercises.forEach((exercise, exerciseIdx) => {
      const numSets = exercise.setDetails && exercise.setDetails.length > 0
        ? exercise.setDetails.length
        : exercise.sets

      // Only add card if this exercise has this many sets
      if (setIdx < numSets) {
        const setDetail = exercise.setDetails?.[setIdx]
        const isLastExerciseInRound = exerciseIdx === exercises.length - 1

        cards.push({
          id: `${exercise.id}-set-${setIdx + 1}`,
          exerciseId: exercise.id,
          exerciseName: exercise.name,
          exerciseNumber: exerciseIdx + 1,
          setNumber: setIdx + 1,
          totalSets: numSets,
          reps: setDetail?.reps || exercise.reps,
          weight: setDetail?.weight || exercise.weight,
          restSeconds: exercise.restSeconds,
          notes: exercise.notes,
          isLastSetOfExercise: isLastExerciseInRound,
        })
      }
    })
  }

  return cards
}

export default function WorkoutSessionPage() {
  const { isAuthenticated, user } = useAuthStore()
  const router = useRouter()
  const params = useParams()
  const [workout, setWorkout] = useState<Workout | null>(null)
  const [workoutCards, setWorkoutCards] = useState<WorkoutCard[]>([])
  const [loading, setLoading] = useState(true)
  const [sessionStartTime, setSessionStartTime] = useState<number | null>(null)
  const [sessionDuration, setSessionDuration] = useState(0)
  const [currentCardIndex, setCurrentCardIndex] = useState(0)
  const [completedCards, setCompletedCards] = useState<Set<string>>(new Set())
  const [showRestTimer, setShowRestTimer] = useState(false)
  const [restTimeRemaining, setRestTimeRemaining] = useState(0)
  const [showCompletionDialog, setShowCompletionDialog] = useState(false)
  const [showEndDialog, setShowEndDialog] = useState(false)
  const [workoutNotes, setWorkoutNotes] = useState("")
  const [showNotesInput, setShowNotesInput] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const sessionIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const restIntervalRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    const workoutId = params?.id as string
    if (workoutId && user?.id) {
      loadWorkout(workoutId)
      // Start session timer
      const startTime = Date.now()
      setSessionStartTime(startTime)

      sessionIntervalRef.current = setInterval(() => {
        setSessionDuration(Math.floor((Date.now() - startTime) / 1000))
      }, 1000)
    }

    return () => {
      if (sessionIntervalRef.current) clearInterval(sessionIntervalRef.current)
      if (restIntervalRef.current) clearInterval(restIntervalRef.current)
    }
  }, [params?.id, user?.id])

  // Reset save success state when dialog closes
  useEffect(() => {
    if (!showCompletionDialog) {
      setSaveSuccess(false)
      setIsSaving(false)
    }
  }, [showCompletionDialog])

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't handle keyboard shortcuts if user is typing in an input/textarea
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return
      }

      // Escape key - close dialogs
      if (e.key === 'Escape') {
        if (showCompletionDialog && !saveSuccess) {
          setShowCompletionDialog(false)
        } else if (showEndDialog) {
          setShowEndDialog(false)
        }
        return
      }

      // Don't handle navigation if dialog is open
      if (showCompletionDialog || showEndDialog) {
        return
      }

      // Arrow keys - navigate between cards
      if (e.key === 'ArrowLeft') {
        e.preventDefault()
        if (currentCardIndex > 0) {
          setCurrentCardIndex(currentCardIndex - 1)
        }
      } else if (e.key === 'ArrowRight') {
        e.preventDefault()
        if (currentCardIndex < workoutCards.length - 1 && completedCards.has(workoutCards[currentCardIndex].id)) {
          setCurrentCardIndex(currentCardIndex + 1)
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [currentCardIndex, workoutCards, completedCards, showCompletionDialog, showEndDialog, saveSuccess])

  const loadWorkout = async (workoutId: string) => {
    setLoading(true)
    try {
      const response = await fetch(`/api/workouts/${workoutId}`)
      if (response.ok) {
        const { workout: dbWorkout } = await response.json()
        const transformedWorkout: Workout = {
          id: dbWorkout.workoutId,
          title: dbWorkout.title,
          description: dbWorkout.description || '',
          exercises: dbWorkout.exercises || [],
          totalDuration: dbWorkout.totalDuration || 0,
          difficulty: dbWorkout.difficulty || 'medium',
          timerConfig: dbWorkout.timerConfig,
          workoutType: dbWorkout.workoutType,
          structure: dbWorkout.structure,
        }
        setWorkout(transformedWorkout)
        setWorkoutCards(flattenExercisesToCards(transformedWorkout.exercises))
      } else {
        const workouts = JSON.parse(localStorage.getItem('workouts') || '[]')
        const found = workouts.find((w: Workout) => w.id === workoutId)
        if (found) {
          setWorkout(found)
          setWorkoutCards(flattenExercisesToCards(found.exercises))
        } else {
          setWorkout(null)
          setWorkoutCards([])
        }
      }
    } catch (error) {
      console.error('Error loading workout:', error)
      const workouts = JSON.parse(localStorage.getItem('workouts') || '[]')
      const found = workouts.find((w: Workout) => w.id === workoutId)
      if (found) {
        setWorkout(found)
        setWorkoutCards(flattenExercisesToCards(found.exercises))
      } else {
        setWorkout(null)
        setWorkoutCards([])
      }
    } finally {
      setLoading(false)
    }
  }

  const handleCompleteCard = () => {
    if (workoutCards.length === 0) return

    const currentCard = workoutCards[currentCardIndex]
    const newCompleted = new Set(completedCards)
    newCompleted.add(currentCard.id)
    setCompletedCards(newCompleted)

    // Check if this was the last card
    if (currentCardIndex === workoutCards.length - 1) {
      // Show completion dialog
      if (sessionIntervalRef.current) clearInterval(sessionIntervalRef.current)
      setShowNotesInput(false) // Reset notes input visibility
      setWorkoutNotes("") // Clear previous notes
      setShowCompletionDialog(true)
      return
    }

    // Show rest timer if card has rest configured and it's the last set of the exercise
    if (currentCard.isLastSetOfExercise && currentCard.restSeconds && currentCard.restSeconds > 0) {
      startRestTimer(currentCard.restSeconds)
    } else {
      // Move to next card immediately
      setCurrentCardIndex(prev => prev + 1)
    }
  }

  const startRestTimer = (seconds: number) => {
    setRestTimeRemaining(seconds)
    setShowRestTimer(true)

    restIntervalRef.current = setInterval(() => {
      setRestTimeRemaining(prev => {
        if (prev <= 1) {
          // Timer finished, auto-advance
          if (restIntervalRef.current) clearInterval(restIntervalRef.current)
          setShowRestTimer(false)
          setCurrentCardIndex(prevIndex => prevIndex + 1)
          return 0
        }
        return prev - 1
      })
    }, 1000)
  }

  const skipRest = () => {
    if (restIntervalRef.current) clearInterval(restIntervalRef.current)
    setShowRestTimer(false)
    setRestTimeRemaining(0)
    setCurrentCardIndex(prev => prev + 1)
  }

  const handleMarkCompleted = async (notes?: string) => {
    if (!workout || sessionStartTime === null) return

    setIsSaving(true)

    try {
      const completedAt = new Date().toISOString()
      const todayIso = completedAt.split('T')[0]
      const durationMinutes = Math.floor(sessionDuration / 60)

      // Normalize notes to avoid accidental event objects being stringified
      const rawNotes = typeof notes === 'string' ? notes : workoutNotes
      const normalizedNotes = typeof rawNotes === 'string' ? rawNotes.trim() : ''
      const safeNotes = normalizedNotes.length > 0 ? normalizedNotes : null

      // Save to localStorage
      let existing: any[] = []
      try {
        existing = JSON.parse(localStorage.getItem('completedWorkouts') || '[]')
      } catch {
        existing = []
      }
      const newEntry = {
        id: Date.now().toString(),
        workoutId: workout.id,
        completedAt,
        completedDate: todayIso,
        durationSeconds: sessionDuration,
        durationMinutes,
        notes: safeNotes,
      }
      const updated = [...existing, newEntry]
      localStorage.setItem('completedWorkouts', JSON.stringify(updated))

      // Save to DynamoDB
      if (user?.id) {
        try {
          const completionResponse = await fetch('/api/workouts/completions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              workoutId: workout.id,
              completedAt,
              completedDate: todayIso,
              durationSeconds: sessionDuration,
              durationMinutes,
              notes: safeNotes,
            }),
          })

          if (!completionResponse.ok) {
            const errorData = await completionResponse.json().catch(() => ({}))
            throw new Error(errorData.error || 'Failed to save workout completion')
          }

          const completeResponse = await fetch(`/api/workouts/${workout.id}/complete`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              completedAt,
              completedDate: todayIso,
              durationSeconds: sessionDuration,
            }),
          })

          if (!completeResponse.ok) {
            const errorData = await completeResponse.json().catch(() => ({}))
            throw new Error(errorData.error || 'Failed to mark workout as complete')
          }
        } catch (error) {
          console.error('Error saving completion:', error)
          throw error // Re-throw to be caught by outer catch block
        }
      }

      window.dispatchEvent(new Event('workoutsUpdated'))
      window.dispatchEvent(new Event('calendarUpdated'))

      // Show success state
      setSaveSuccess(true)
      setIsSaving(false)

      // Wait 1.5 seconds to show success celebration, then navigate to calendar
      setTimeout(() => {
        router.push('/calendar')
      }, 1500)

    } catch (error) {
      console.error('Error saving workout:', error)
      setIsSaving(false)
      const errorMessage = error instanceof Error ? error.message : 'Failed to save workout. Please try again.'
      alert(errorMessage)
    }
  }

  const handleEndWorkout = () => {
    // For AMRAP workouts, navigate directly to calendar
    if (workout?.workoutType === 'amrap') {
      if (sessionIntervalRef.current) clearInterval(sessionIntervalRef.current)
      router.push('/calendar')
      return
    }
    // For other workouts, show end dialog
    setShowEndDialog(true)
  }

  const handleDiscardWorkout = () => {
    if (sessionIntervalRef.current) clearInterval(sessionIntervalRef.current)
    if (restIntervalRef.current) clearInterval(restIntervalRef.current)
    router.push('/calendar')
  }

  const formatTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600)
    const mins = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60
    if (hrs > 0) {
      return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const navigateToCard = (index: number) => {
    setCurrentCardIndex(index)
  }

  if (!isAuthenticated) {
    return <Login />
  }

  if (loading) {
    return (
      <>
        <Header />
        <main className="min-h-screen flex items-center justify-center bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
          <div className="text-center">
            <Loader2 className="h-12 w-12 text-primary mx-auto mb-4 animate-spin" />
            <p className="text-text-secondary">Loading workout session...</p>
          </div>
        </main>
      </>
    )
  }

  if (!workout) {
    return (
      <>
        <Header />
        <main className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <p className="text-text-secondary mb-4">Workout not found</p>
            <Button onClick={() => router.push('/')}>Go Home</Button>
          </div>
        </main>
      </>
    )
  }

  const currentCard = workoutCards[currentCardIndex]
  const progress = workoutCards.length > 0 ? ((completedCards.size) / workoutCards.length) * 100 : 0

  // Check if this is an AMRAP workout
  const isAMRAP = workout.workoutType === 'amrap'

  // Extract time limit for AMRAP
  const amrapTimeLimit =
    workout.structure?.timeLimit ||
    (workout.timerConfig?.params?.durationSeconds) ||
    720 // Default 12 minutes

  return (
    <>
      <Header />
      <main className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 pb-32">
        {/* Top Bar */}
        <div className="sticky top-0 z-30 bg-slate-900/95 backdrop-blur-sm border-b border-slate-800 px-4 py-3">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center justify-between mb-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleEndWorkout}
                className="text-text-secondary hover:text-white"
              >
                <X className="h-5 w-5 mr-2" />
                End
              </Button>
              {!isAMRAP && (
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2 text-text-secondary">
                    <Clock className="h-4 w-4" />
                    <span className="text-sm font-mono tabular-nums">{formatTime(sessionDuration)}</span>
                  </div>
                  <span className="text-sm text-text-secondary">
                    {completedCards.size}/{workoutCards.length} exercises
                  </span>
                </div>
              )}
              {isAMRAP && (
                <div className="flex items-center gap-2 text-text-secondary">
                  <Clock className="h-4 w-4" />
                  <span className="text-sm font-mono tabular-nums">{formatTime(sessionDuration)}</span>
                </div>
              )}
            </div>
            {!isAMRAP && <Progress value={progress} className="h-1" />}
          </div>
        </div>

        {/* AMRAP Session View */}
        {isAMRAP ? (
          <AMRAPSessionView
            workout={workout}
            exercises={workout.exercises}
            timeLimit={amrapTimeLimit}
            onComplete={(notes) => {
              handleMarkCompleted(notes)
            }}
            onEnd={handleEndWorkout}
          />
        ) : (
          /* Card Carousel */
          <>
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="relative">
            {/* Previous Card (smaller, faded) */}
            {currentCardIndex > 0 && (
              <div
                className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-full w-64 opacity-30 scale-75 transition-all cursor-pointer hover:opacity-50"
                onClick={() => navigateToCard(currentCardIndex - 1)}
              >
                <WorkoutSetCard
                  card={workoutCards[currentCardIndex - 1]}
                  isCompleted={completedCards.has(workoutCards[currentCardIndex - 1].id)}
                  isActive={false}
                  onComplete={() => {}}
                />
              </div>
            )}

            {/* Current Card (large, centered) */}
            <div className="mx-auto max-w-md">
              <WorkoutSetCard
                card={currentCard}
                isCompleted={completedCards.has(currentCard.id)}
                isActive={true}
                onComplete={handleCompleteCard}
              />
            </div>

            {/* Next Card (smaller, faded) - Preview only, not clickable */}
            {currentCardIndex < workoutCards.length - 1 && (
              <div
                className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-full w-64 opacity-30 scale-75 transition-all pointer-events-none"
              >
                <WorkoutSetCard
                  card={workoutCards[currentCardIndex + 1]}
                  isCompleted={completedCards.has(workoutCards[currentCardIndex + 1].id)}
                  isActive={false}
                  onComplete={() => {}}
                />
              </div>
            )}
          </div>

          {/* Navigation Hints - Only allow backward navigation */}
          <div className="flex flex-col items-center gap-2 mt-8">
            <div className="flex items-center justify-center gap-8">
              {currentCardIndex > 0 && (
                <Button
                  variant="ghost"
                  onClick={() => navigateToCard(currentCardIndex - 1)}
                  className="text-text-secondary"
                >
                  <ChevronLeft className="h-5 w-5 mr-2" />
                  Review Previous
                </Button>
              )}
            </div>
            <div className="text-xs text-text-secondary/60 text-center">
              Use ← → arrow keys to navigate • Esc to close dialogs
            </div>
          </div>
        </div>

        {/* Rest Timer Overlay */}
        {showRestTimer && (
          <div className="fixed inset-0 z-40 bg-black/80 backdrop-blur-sm flex items-center justify-center">
            <Card className="w-80 bg-slate-800 border-slate-700">
              <CardContent className="pt-8 pb-6 text-center">
                <div className="mb-4">
                  <Timer className="h-16 w-16 text-primary mx-auto mb-4" />
                  <h3 className="text-2xl font-bold text-white mb-2">Rest Time</h3>
                  <p className="text-text-secondary text-sm">Take a breather before the next exercise</p>
                </div>
                <div className="text-6xl font-bold text-primary tabular-nums mb-6">
                  {formatTime(restTimeRemaining)}
                </div>
                <Button
                  onClick={skipRest}
                  variant="outline"
                  className="w-full"
                >
                  Skip Rest
                </Button>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Workout Timer Bottom Bar - Only for non-AMRAP workouts */}
        {!isAMRAP && workout.timerConfig && (
          <div className="fixed bottom-0 left-0 right-0 z-20 bg-slate-900/95 backdrop-blur-sm border-t border-slate-800">
            <div className="max-w-4xl mx-auto px-4 py-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Timer className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium text-white">
                    Workout Timer
                  </span>
                  {workout.timerConfig.aiGenerated && (
                    <Badge variant="secondary" className="text-xs">
                      <Sparkles className="h-3 w-3 mr-1" />
                      AI
                    </Badge>
                  )}
                </div>
                <WorkoutTimer
                  params={workout.timerConfig.params}
                  persistKey={`workout-${workout.id}-session-timer`}
                />
              </div>
            </div>
          </div>
        )}
          </>
        )}
      </main>

      {/* Completion Dialog */}
      <Dialog
        open={showCompletionDialog}
        onOpenChange={(open) => {
          // Prevent closing during save
          if (!isSaving && !saveSuccess) {
            setShowCompletionDialog(open)
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          {saveSuccess ? (
            // Success State
            <>
              <DialogHeader>
                <div className="flex items-center justify-center mb-6">
                  <div className="relative">
                    <div className="absolute inset-0 bg-green-500/20 rounded-full animate-ping" />
                    <div className="relative bg-green-500 rounded-full p-6">
                      <CheckCircle className="h-16 w-16 text-white" />
                    </div>
                  </div>
                </div>
                <DialogTitle className="text-center text-3xl font-bold">
                  Saved! 🎉
                </DialogTitle>
                <DialogDescription className="text-center text-lg mt-2">
                  Your workout has been saved successfully
                </DialogDescription>
              </DialogHeader>
              <div className="py-4 text-center text-text-secondary">
                Taking you to your calendar...
              </div>
            </>
          ) : (
            // Normal/Saving State
            <>
              <DialogHeader>
                <div className="flex items-center justify-center mb-4">
                  <div className="bg-green-100 rounded-full p-4 animate-bounce">
                    <Trophy className="h-12 w-12 text-green-600" />
                  </div>
                </div>
                <DialogTitle className="text-center text-2xl">
                  Workout Complete! 🎉
                </DialogTitle>
                <DialogDescription className="text-center text-lg">
                  Amazing work! You crushed it in{' '}
                  <span className="font-bold text-primary">{formatTime(sessionDuration)}</span>
                </DialogDescription>
              </DialogHeader>
              <div className="my-4 space-y-3">
                <div className="flex items-center justify-between p-3 bg-surface rounded-lg">
                  <span className="text-text-secondary">Workout:</span>
                  <span className="font-medium">{workout.title}</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-surface rounded-lg">
                  <span className="text-text-secondary">Exercises:</span>
                  <span className="font-medium">{completedCards.size} completed</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-surface rounded-lg">
                  <span className="text-text-secondary">Duration:</span>
                  <span className="font-medium">{Math.floor(sessionDuration / 60)} min</span>
                </div>

                {/* Optional Notes Section */}
                {!showNotesInput ? (
                  <Button
                    variant="ghost"
                    onClick={() => setShowNotesInput(true)}
                    className="w-full text-text-secondary hover:text-primary"
                    disabled={isSaving}
                  >
                    <Sparkles className="h-4 w-4 mr-2" />
                    Add Notes (Optional)
                  </Button>
                ) : (
                  <div className="space-y-2">
                    <label htmlFor="workout-notes" className="text-sm font-medium text-text-secondary">
                      Workout Notes
                    </label>
                    <Textarea
                      id="workout-notes"
                      placeholder="How did it feel? Any PRs or observations..."
                      value={workoutNotes}
                      onChange={(e) => setWorkoutNotes(e.target.value)}
                      className="min-h-[100px] resize-none"
                      autoFocus
                      disabled={isSaving}
                    />
                  </div>
                )}
              </div>
              <DialogFooter className="flex-col sm:flex-row gap-2">
                <Button
                  onClick={() => handleMarkCompleted()}
                  className="w-full bg-green-600 hover:bg-green-700"
                  size="lg"
                  disabled={isSaving}
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="h-5 w-5 mr-2" />
                      Save Workout
                    </>
                  )}
                </Button>
                <Button
                  variant="ghost"
                  onClick={handleDiscardWorkout}
                  className="w-full sm:w-auto text-text-secondary"
                  size="sm"
                  disabled={isSaving}
                >
                  Discard
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* End Workout Dialog */}
      <Dialog open={showEndDialog} onOpenChange={setShowEndDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>End Workout?</DialogTitle>
            <DialogDescription>
              You&apos;ve completed {completedCards.size} out of {workoutCards.length} exercises.
              Do you want to save your progress?
            </DialogDescription>
          </DialogHeader>
          <div className="my-4 space-y-2">
            <label htmlFor="end-workout-notes" className="text-sm font-medium text-text-secondary">
              Notes (optional)
            </label>
            <Textarea
              id="end-workout-notes"
              placeholder="How did it feel? Any PRs or observations..."
              value={workoutNotes}
              onChange={(e) => setWorkoutNotes(e.target.value)}
              className="min-h-[100px] resize-none"
            />
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={handleDiscardWorkout}
              className="w-full sm:w-auto"
            >
              End Without Saving
            </Button>
            <Button
              variant="outline"
              onClick={() => setShowEndDialog(false)}
              className="w-full sm:w-auto"
            >
              Continue Workout
            </Button>
            <Button
              onClick={() => handleMarkCompleted()}
              className="w-full sm:w-auto"
            >
              Save & End
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

interface WorkoutSetCardProps {
  card: WorkoutCard
  isCompleted: boolean
  isActive: boolean
  onComplete: () => void
}

function WorkoutSetCard({
  card,
  isCompleted,
  isActive,
  onComplete,
}: WorkoutSetCardProps) {
  return (
    <Card
      className={cn(
        "transition-all duration-300",
        isActive ? "bg-slate-800 border-slate-700 shadow-2xl" : "bg-slate-900 border-slate-800",
        isCompleted && "border-green-500/50"
      )}
    >
      <CardContent className="pt-8 pb-6">
        {/* Exercise Number Badge */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-lg font-bold text-primary">
            {card.exerciseNumber}
          </div>
          {isCompleted && (
            <div className="flex items-center gap-2 text-green-500">
              <CheckCircle className="h-6 w-6" />
              <span className="text-sm font-medium">Complete</span>
            </div>
          )}
        </div>

        {/* Exercise Name */}
        <h2 className="text-3xl font-bold text-white mb-2 capitalize">
          {card.exerciseName}
        </h2>

        {/* Set Information */}
        <div className="mb-6">
          <Badge variant="secondary" className="text-sm">
            Round {card.setNumber} of {card.totalSets}
          </Badge>
        </div>

        {/* Exercise Details */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          {card.reps && (
            <div className="p-4 bg-slate-900/60 rounded-lg text-center">
              <div className="text-3xl font-bold text-white">{card.reps}</div>
              <div className="text-sm text-text-secondary">reps</div>
            </div>
          )}
          {card.weight && (
            <div className="p-4 bg-slate-900/60 rounded-lg text-center">
              <div className="text-3xl font-bold text-white">{card.weight}</div>
              <div className="text-sm text-text-secondary">weight</div>
            </div>
          )}
        </div>

        {/* Rest indicator (only shown on last set) */}
        {card.isLastSetOfExercise && card.restSeconds && card.restSeconds > 0 && (
          <div className="mb-6 p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg text-center">
            <div className="text-sm text-blue-400">
              {card.restSeconds}s rest after this set
            </div>
          </div>
        )}

        {/* Notes */}
        {card.notes && (
          <p className="text-sm text-text-secondary mb-6 italic">
            {card.notes}
          </p>
        )}

        {/* Complete Button */}
        {isActive && !isCompleted && (
          <Button
            onClick={onComplete}
            className="w-full h-14 text-lg font-semibold bg-primary hover:bg-primary/90"
            size="lg"
          >
            <CheckCircle className="h-6 w-6 mr-2" />
            Complete Exercise
          </Button>
        )}

        {isActive && isCompleted && (
          <div className="w-full h-14 flex items-center justify-center bg-green-500/20 border border-green-500/50 rounded-lg">
            <CheckCircle className="h-6 w-6 text-green-500 mr-2" />
            <span className="text-lg font-semibold text-green-500">Completed</span>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
