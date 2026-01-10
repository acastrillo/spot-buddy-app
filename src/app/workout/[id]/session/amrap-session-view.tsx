"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { useTimerRunner } from "@/lib/hooks/useTimerRunner"
import { AMRAPTimerCard } from "@/components/workout/amrap-timer-card"
import { AMRAPExerciseList } from "@/components/workout/amrap-exercise-list"
import { AMRAPBlockNavigator } from "@/components/workout/amrap-block-navigator"
import { BlockTransitionDialog } from "@/components/workout/block-transition-dialog"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Trophy } from "lucide-react"
import {
  normalizeAMRAPWorkout,
  calculateRoundsFromProgress,
  calculatePartialRepsFromProgress,
  formatCompletionScore,
} from "@/lib/amrap-migration"
import type { AMRAPBlock, BlockState } from "@/types/amrap"

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
  amrapBlocks?: AMRAPBlock[]
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
  workout,
  exercises,
  timeLimit,
  onComplete,
  onEnd,
}: AMRAPSessionViewProps) {
  // Normalize workout to blocks (backward compatible)
  const blocks = useMemo(() => {
    return normalizeAMRAPWorkout(workout as any)
  }, [workout])

  // Multi-block state
  const [currentBlockIndex, setCurrentBlockIndex] = useState(0)
  const [blockStates, setBlockStates] = useState<Map<string, BlockState>>(new Map())
  const [showTransition, setShowTransition] = useState(false)

  // Single block state
  const [soundEnabled, setSoundEnabled] = useState(true)
  const [checkedExercises, setCheckedExercises] = useState<Set<string>>(new Set())
  const [exerciseCounts, setExerciseCounts] = useState<Map<string, number>>(new Map())
  const [showCountdown, setShowCountdown] = useState(false)
  const [countdownValue, setCountdownValue] = useState(5)
  const [showCompletionDialog, setShowCompletionDialog] = useState(false)
  const [completionNotes, setCompletionNotes] = useState('')

  const currentBlock = blocks[currentBlockIndex]
  const nextBlock = blocks[currentBlockIndex + 1]
  const isMultiBlock = blocks.length > 1

  const timerParams = useMemo(
    () => ({
      kind: 'AMRAP' as const,
      durationSeconds: currentBlock.timeLimit,
    }),
    [currentBlock.id, currentBlock.timeLimit]
  )

  // Initialize timer for current block
  const timer = useTimerRunner({
    params: timerParams,
    persistKey: `amrap-${workout.id}-block-${currentBlock.id}`,
    enableSound: soundEnabled,
    enableNotifications: true,
    onComplete: handleBlockComplete,
  })

  // Reset timer when block changes
  useEffect(() => {
    timer.reset()
    // Restore checked exercises and counts from block state if available
    const savedState = blockStates.get(currentBlock.id)
    if (savedState) {
      setCheckedExercises(new Set(savedState.checkedExercises))
      setExerciseCounts(new Map(savedState.exerciseCounts || []))
    } else {
      setCheckedExercises(new Set())
      setExerciseCounts(new Map())
    }
  }, [currentBlockIndex])

  function handleBlockComplete() {
    // Calculate rounds completed
    const roundsCompleted = calculateRoundsFromProgress(
      currentBlock.exercises,
      checkedExercises,
      exerciseCounts
    )

    // Save block state
    setBlockStates((prev) => {
      const newStates = new Map(prev)
      newStates.set(currentBlock.id, {
        completed: true,
        roundsCompleted,
        checkedExercises: new Set(checkedExercises),
        exerciseCounts: new Map(exerciseCounts),
      })
      return newStates
    })

    if (nextBlock) {
      // More blocks to go - show transition dialog
      setShowTransition(true)
    } else {
      // All blocks complete - show countdown then final completion
      setShowCountdown(true)
      setCountdownValue(5)
    }
  }

  // Countdown effect (after all blocks complete)
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

  const handleIncrementExercise = useCallback((id: string) => {
    setExerciseCounts((prev) => {
      const updated = new Map(prev)
      const currentCount = updated.get(id) || 0
      updated.set(id, currentCount + 1)
      return updated
    })
  }, [])

  const handleContinueToNextBlock = useCallback(() => {
    setShowTransition(false)
    setCurrentBlockIndex((prev) => prev + 1)
    setCheckedExercises(new Set()) // Reset for new block
    setExerciseCounts(new Map()) // Reset counts for new block
  }, [])

  const handleNavigateToBlock = useCallback((index: number) => {
    // Save current block state before navigating
    const roundsCompleted = calculateRoundsFromProgress(
      currentBlock.exercises,
      checkedExercises,
      exerciseCounts
    )

    setBlockStates((prev) => {
      const newStates = new Map(prev)
      newStates.set(currentBlock.id, {
        completed: false,
        roundsCompleted,
        checkedExercises: new Set(checkedExercises),
        exerciseCounts: new Map(exerciseCounts),
      })
      return newStates
    })

    setCurrentBlockIndex(index)
  }, [checkedExercises, exerciseCounts, currentBlock])

  const handleSaveWorkout = () => {
    // Build comprehensive notes
    let notes = ''

    if (isMultiBlock) {
      // Multi-block summary
      notes = blocks
        .map((block, idx) => {
          const state = blockStates.get(block.id)
          const checkedSet = state?.checkedExercises || new Set<string>()
          const countMap = state?.exerciseCounts || new Map<string, number>()
          const rounds = calculateRoundsFromProgress(block.exercises, checkedSet, countMap)
          const partial = calculatePartialRepsFromProgress(block.exercises, checkedSet, countMap)
          const score = formatCompletionScore(
            rounds * block.exercises.length + partial,
            block.exercises.length
          )
          return `${block.label}: ${score}`
        })
        .join('\n')

      if (completionNotes) {
        notes += `\n\nNotes: ${completionNotes}`
      }
    } else {
      // Single block notes
      const rounds = calculateRoundsFromProgress(
        currentBlock.exercises,
        checkedExercises,
        exerciseCounts
      )
      const partial = calculatePartialRepsFromProgress(
        currentBlock.exercises,
        checkedExercises,
        exerciseCounts
      )
      const score = formatCompletionScore(
        rounds * currentBlock.exercises.length + partial,
        currentBlock.exercises.length
      )
      notes = score
      if (completionNotes) {
        notes += `\n\nNotes: ${completionNotes}`
      }
    }

    // Close dialog and trigger save with notes
    setShowCompletionDialog(false)
    onComplete(notes)
  }

  const handleExitWithoutSaving = () => {
    // Close dialog and trigger exit without saving
    setShowCompletionDialog(false)
    onEnd()
  }

  // Calculate current rounds completed
  const roundsCompleted = calculateRoundsFromProgress(
    currentBlock.exercises,
    checkedExercises,
    exerciseCounts
  )

  // Get completed block IDs
  const completedBlocks = new Set(
    Array.from(blockStates.entries())
      .filter(([, state]) => state.completed)
      .map(([id]) => id)
  )

  return (
    <>
      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
        {/* Multi-block navigation */}
        {isMultiBlock && (
          <AMRAPBlockNavigator
            blocks={blocks}
            currentIndex={currentBlockIndex}
            onNavigate={handleNavigateToBlock}
            completedBlocks={completedBlocks}
          />
        )}

        {/* Timer */}
        <AMRAPTimerCard
          remainingSeconds={Math.floor(timer.remainingMs / 1000)}
          totalSeconds={currentBlock.timeLimit}
          blockLabel={
            isMultiBlock
              ? `${currentBlock.label} (${currentBlockIndex + 1}/${blocks.length})`
              : undefined
          }
          isRunning={timer.isRunning}
          onPlayPause={() => {
            if (timer.isRunning) {
              timer.pause()
            } else if (timer.isPaused) {
              timer.resume()
            } else {
              timer.start()
            }
          }}
          onReset={timer.reset}
          soundEnabled={soundEnabled}
          onToggleSound={() => setSoundEnabled(!soundEnabled)}
        />

        {/* Exercise list */}
        <AMRAPExerciseList
          exercises={currentBlock.exercises}
          checkedExercises={checkedExercises}
          exerciseCounts={exerciseCounts}
          onToggle={handleToggleExercise}
          onIncrement={handleIncrementExercise}
          roundsCompleted={roundsCompleted}
        />
      </div>

      {/* Block transition dialog (multi-block only) */}
      {showTransition && nextBlock && (
        <BlockTransitionDialog
          open={showTransition}
          currentBlock={currentBlock}
          nextBlock={nextBlock}
          roundsCompleted={roundsCompleted}
          onContinue={handleContinueToNextBlock}
          onSkip={handleContinueToNextBlock}
        />
      )}

      {/* 5-Second Countdown Overlay (after all blocks complete) */}
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

      {/* Final Completion Dialog */}
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
              {isMultiBlock
                ? `You crushed all ${blocks.length} blocks!`
                : `You crushed the AMRAP!`}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Summary */}
            {isMultiBlock ? (
              <div className="space-y-2">
                <h4 className="font-medium text-white mb-2">Block Summary</h4>
                {blocks.map((block) => {
                  const state = blockStates.get(block.id)
                  const rounds = state?.roundsCompleted || 0
                  return (
                    <div
                      key={block.id}
                      className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg"
                    >
                      <span className="text-sm text-white">{block.label}</span>
                      <span className="text-sm font-medium text-primary">
                        {rounds} round{rounds !== 1 ? 's' : ''}
                      </span>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4 p-4 bg-slate-800/50 rounded-lg">
                <div className="text-center">
                  <p className="text-sm text-text-secondary mb-1">Rounds</p>
                  <p className="text-lg font-bold text-white">{roundsCompleted}</p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-text-secondary mb-1">Exercises</p>
                  <p className="text-lg font-bold text-white">
                    {currentBlock.exercises.length}
                  </p>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="notes" className="text-white">
                Notes (optional)
              </Label>
              <Textarea
                id="notes"
                placeholder={
                  isMultiBlock
                    ? "Add any additional notes about your performance..."
                    : "Example: 5 rounds + 12 reps into round 6, felt strong on squats"
                }
                value={completionNotes}
                onChange={(e) => setCompletionNotes(e.target.value)}
                className="bg-slate-800 border-slate-700 text-white min-h-[100px]"
              />
              <p className="text-xs text-text-secondary">
                Track your performance or any other details
              </p>
            </div>
          </div>

          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={handleExitWithoutSaving}
              className="flex-1"
            >
              Exit Without Saving
            </Button>
            <Button onClick={handleSaveWorkout} className="flex-1">
              Save Workout
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
