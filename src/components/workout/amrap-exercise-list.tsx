"use client"

import { useState, useCallback } from "react"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { cn } from "@/lib/utils"
import type { Exercise } from "@/types/amrap"

interface AMRAPExerciseListProps {
  exercises: Exercise[]
  checkedExercises: Set<string>
  exerciseCounts: Map<string, number>
  onToggle: (id: string) => void
  onIncrement: (id: string) => void
  roundsCompleted: number
}

export function AMRAPExerciseList({
  exercises,
  checkedExercises,
  exerciseCounts,
  onToggle,
  onIncrement,
  roundsCompleted,
}: AMRAPExerciseListProps) {
  // Track which exercise is being animated
  const [animatingExercise, setAnimatingExercise] = useState<string | null>(null)

  const handleExerciseTap = useCallback((exerciseId: string) => {
    onIncrement(exerciseId)

    // Trigger animation
    setAnimatingExercise(exerciseId)
    setTimeout(() => setAnimatingExercise(null), 300)
  }, [onIncrement])
  if (exercises.length === 0) {
    return (
      <Card className="p-6">
        <p className="text-center text-muted-foreground">No exercises in this AMRAP</p>
      </Card>
    )
  }

  return (
    <Card className="border-l-4 border-l-blue-500 overflow-hidden">
      <div className="p-4 md:p-6 space-y-4">
        {/* Header with circuit label and rounds counter */}
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <h3 className="text-lg md:text-xl font-semibold">Circuit</h3>
          <Badge variant="secondary" className="text-sm px-3 py-1">
            {roundsCompleted} Round{roundsCompleted !== 1 ? 's' : ''} Completed
          </Badge>
        </div>

        {/* Instructions */}
        <p className="text-sm text-muted-foreground">
          Tap on an exercise to count completed reps. Use the checkbox to mark it as done.
        </p>

        {/* Exercise list */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {exercises.map((exercise, idx) => {
            const isChecked = checkedExercises.has(exercise.id)
            const count = exerciseCounts.get(exercise.id) || 0
            const isAnimating = animatingExercise === exercise.id

            return (
              <div
                key={exercise.id}
                className={cn(
                  "flex flex-col gap-3 p-3 rounded-lg border transition-all duration-200",
                  isChecked ? "bg-green-50 dark:bg-green-950/20 border-green-300 dark:border-green-700" : "bg-background",
                  isAnimating && "scale-105 shadow-lg"
                )}
              >
                {/* Header with checkbox and counter */}
                <div className="flex items-start gap-3">
                  <Checkbox
                    id={exercise.id}
                    checked={isChecked}
                    onCheckedChange={() => onToggle(exercise.id)}
                    className="mt-1 shrink-0"
                  />

                  <div className="flex-1 space-y-1">
                    {/* Exercise number badge */}
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold">
                        {idx + 1}
                      </span>
                      <span className="text-xs text-muted-foreground uppercase tracking-wide">
                        Exercise {idx + 1}
                      </span>
                    </div>

                    {/* Exercise name with reps */}
                    <div className="font-medium text-base">
                      {exercise.reps} x {exercise.name}
                    </div>

                    {/* Weight */}
                    {exercise.weight && (
                      <div className="text-sm text-muted-foreground">
                        {exercise.weight}
                      </div>
                    )}

                    {/* Notes/Form cues */}
                    {exercise.notes && (
                      <div className="text-xs italic text-muted-foreground line-clamp-2">
                        {exercise.notes}
                      </div>
                    )}
                  </div>
                </div>

                {/* Tap counter button */}
                <button
                  onClick={() => handleExerciseTap(exercise.id)}
                  className={cn(
                    "w-full py-2 px-3 rounded-md font-medium text-sm transition-all",
                    "bg-primary/10 hover:bg-primary/20 active:bg-primary/30",
                    "text-primary border border-primary/20",
                    "flex items-center justify-between gap-2",
                    isAnimating && "bg-primary text-primary-foreground"
                  )}
                >
                  <span>Tap to count</span>
                  <Badge
                    variant={count > 0 ? "default" : "secondary"}
                    className={cn(
                      "min-w-[40px] justify-center transition-all",
                      isAnimating && "scale-125"
                    )}
                  >
                    {count}
                  </Badge>
                </button>
              </div>
            )
          })}
        </div>

      </div>
    </Card>
  )
}
