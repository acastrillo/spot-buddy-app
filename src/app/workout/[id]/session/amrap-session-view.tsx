"use client"

import { useState, useEffect, useCallback } from "react"
import { useTimerRunner } from "@/lib/hooks/useTimerRunner"
import { AMRAPWrapperCard } from "@/components/workout/amrap-wrapper-card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Trophy } from "lucide-react"

interface Exercise {
  id: string
  name: string
  sets: number
  reps: string | number
  weight?: string
  restSeconds?: number
  notes?: string
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
  }
  timerConfig?: {
    params: any
    aiGenerated?: boolean
    reason?: string
  }
}

interface AMRAPSessionViewProps {
  workout: Workout
  exercises: Exercise[]
  timeLimit: number
  onComplete: (notes?: string) => void
  onEnd: () => void
}

export default function AMRAPSessionView({
  exercises,
  timeLimit,
  onComplete,
}: AMRAPSessionViewProps) {
  const [soundEnabled, setSoundEnabled] = useState(true)
  const [checkedExercises, setCheckedExercises] = useState<Set<string>>(new Set())
  const [showCountdown, setShowCountdown] = useState(false)
  const [countdownValue, setCountdownValue] = useState(5)
  const [showCompletionDialog, setShowCompletionDialog] = useState(false)
  const [completionNotes, setCompletionNotes] = useState('')

  // Initialize timer
  const timer = useTimerRunner({
    params: {
      kind: 'AMRAP',
      durationSeconds: timeLimit,
    },
    enableSound: soundEnabled,
    enableNotifications: true,
    onComplete: handleTimerComplete,
  })

  function handleTimerComplete() {
    // Start the 5-second countdown
    setShowCountdown(true)
    setCountdownValue(5)
  }

  // Countdown effect
  useEffect(() => {
    if (!showCountdown) return

    if (countdownValue === 0) {
      setShowCountdown(false)
      setShowCompletionDialog(true)
      return
    }

    const interval = setInterval(() => {
      setCountdownValue((prev) => prev - 1)
    }, 1000)

    return () => clearInterval(interval)
  }, [showCountdown, countdownValue])

  const handleToggleExercise = useCallback((id: string) => {
    setCheckedExercises((prev) => {
      const updated = new Set(prev)
      if (updated.has(id)) {
        updated.delete(id)
      } else {
        updated.add(id)
      }
      return updated
    })
  }, [])

  const handleSaveWorkout = () => {
    onComplete(completionNotes || undefined)
  }

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <>
      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-4 py-8">
        <AMRAPWrapperCard
          exercises={exercises}
          timer={timer}
          timeLimit={timeLimit}
          soundEnabled={soundEnabled}
          onToggleSound={() => setSoundEnabled(!soundEnabled)}
          checkedExercises={checkedExercises}
          onToggleExercise={handleToggleExercise}
          isExpired={timer.isCompleted}
        />
      </div>

      {/* 5-Second Countdown Overlay */}
      {showCountdown && (
        <div className="fixed inset-0 z-50 bg-slate-950/95 backdrop-blur-sm flex items-center justify-center">
          <div className="text-center">
            <div className="text-8xl font-bold text-primary mb-4 animate-pulse">
              {countdownValue}
            </div>
            <p className="text-xl text-text-secondary">
              Time&apos;s up! Great work!
            </p>
          </div>
        </div>
      )}

      {/* Completion Dialog */}
      <Dialog open={showCompletionDialog} onOpenChange={setShowCompletionDialog}>
        <DialogContent className="bg-slate-900 border-slate-700">
          <DialogHeader>
            <div className="flex items-center justify-center mb-4">
              <div className="h-16 w-16 rounded-full bg-primary/20 flex items-center justify-center">
                <Trophy className="h-8 w-8 text-primary" />
              </div>
            </div>
            <DialogTitle className="text-center text-2xl">
              AMRAP Complete! 💪
            </DialogTitle>
            <DialogDescription className="text-center text-text-secondary">
              You crushed the {formatTime(timeLimit)} AMRAP!
              <br />
              Add notes about rounds completed below.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4 p-4 bg-slate-800/50 rounded-lg">
              <div className="text-center">
                <p className="text-sm text-text-secondary mb-1">Time</p>
                <p className="text-lg font-bold text-white">
                  {formatTime(timeLimit)}
                </p>
              </div>
              <div className="text-center">
                <p className="text-sm text-text-secondary mb-1">Exercises</p>
                <p className="text-lg font-bold text-white">
                  {exercises.length}
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes" className="text-white">
                Notes (optional)
              </Label>
              <Textarea
                id="notes"
                placeholder="Example: 5 rounds + 12 reps into round 6, felt strong on squats"
                value={completionNotes}
                onChange={(e) => setCompletionNotes(e.target.value)}
                className="bg-slate-800 border-slate-700 text-white min-h-[100px]"
              />
              <p className="text-xs text-text-secondary">
                Track your rounds completed or any other details
              </p>
            </div>
          </div>

          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => setShowCompletionDialog(false)}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveWorkout}
              className="flex-1"
            >
              Save Workout
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
