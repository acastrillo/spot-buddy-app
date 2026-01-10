"use client"

import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { AMRAPExerciseItem } from "./amrap-exercise-item"
import { Play, Pause, RotateCcw, Volume2, VolumeX } from "lucide-react"
import { UseTimerRunnerReturn } from "@/lib/hooks/useTimerRunner"
import { useEffect, useState } from "react"

interface Exercise {
  id: string
  name: string
  sets: number
  reps: string | number
  weight?: string
  restSeconds?: number
  notes?: string
}

interface AMRAPWrapperCardProps {
  exercises: Exercise[]
  timer: UseTimerRunnerReturn
  timeLimit: number
  soundEnabled: boolean
  onToggleSound: () => void
  checkedExercises: Set<string>
  onToggleExercise: (id: string) => void
  isExpired?: boolean
}

function formatTime(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes}:${seconds.toString().padStart(2, '0')}`
}

export function AMRAPWrapperCard({
  exercises,
  timer,
  timeLimit,
  soundEnabled,
  onToggleSound,
  checkedExercises,
  onToggleExercise,
  isExpired = false,
}: AMRAPWrapperCardProps) {
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // Calculate color based on remaining time
  const remainingSeconds = Math.floor(timer.remainingMs / 1000)
  const percentRemaining = (remainingSeconds / timeLimit) * 100

  let timerColor = 'text-green-500'
  if (percentRemaining < 20) {
    timerColor = 'text-red-500'
  } else if (percentRemaining < 40) {
    timerColor = 'text-yellow-500'
  }

  return (
    <Card className={`bg-slate-900 border-slate-700 overflow-hidden transition-all ${
      isExpired ? 'ring-4 ring-primary animate-pulse' : ''
    }`}>
      {/* Timer Section */}
      <div className="bg-slate-800/50 border-b border-slate-700 p-6">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between mb-4">
            <Badge
              variant="secondary"
              className="text-sm px-3 py-1 bg-amber-500/20 border-amber-500/40 text-amber-500 font-bold"
            >
              ⏱️ AMRAP {Math.floor(timeLimit / 60)}:00
            </Badge>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={onToggleSound}
                className="text-text-secondary hover:text-white"
              >
                {soundEnabled ? (
                  <Volume2 className="h-4 w-4" />
                ) : (
                  <VolumeX className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>

          {/* Large Timer Display */}
          <div className="text-center mb-4">
            <div className={`text-6xl md:text-7xl font-bold font-mono tabular-nums ${timerColor} transition-colors ${
              remainingSeconds <= 60 ? 'animate-pulse' : ''
            }`}>
              {formatTime(timer.remainingMs)}
            </div>
            <p className="text-sm text-text-secondary mt-2">
              Time Remaining
            </p>
          </div>

          {/* Timer Controls */}
          <div className="flex items-center justify-center gap-3">
            {!timer.isRunning && !timer.isCompleted && (
              <Button
                onClick={timer.start}
                size="lg"
                className="gap-2"
              >
                <Play className="h-5 w-5" />
                {timer.isPaused ? 'Resume' : 'Start'}
              </Button>
            )}
            {timer.isRunning && (
              <Button
                onClick={timer.pause}
                variant="secondary"
                size="lg"
                className="gap-2"
              >
                <Pause className="h-5 w-5" />
                Pause
              </Button>
            )}
            <Button
              onClick={timer.reset}
              variant="outline"
              size="lg"
              className="gap-2"
            >
              <RotateCcw className="h-4 w-4" />
              Reset
            </Button>
          </div>

          {/* Progress Bar */}
          <div className="mt-4 h-2 bg-slate-700 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-1000 ${
                percentRemaining < 20 ? 'bg-red-500' :
                percentRemaining < 40 ? 'bg-yellow-500' : 'bg-green-500'
              }`}
              style={{ width: `${percentRemaining}%` }}
            />
          </div>
        </div>
      </div>

      {/* Exercises Section */}
      <div className="p-6">
        <div className="max-w-4xl mx-auto">
          {/* Round Counter */}
          <div className="mb-4 flex items-center justify-between p-3 bg-slate-800/50 rounded-lg border border-slate-700">
            <span className="text-sm text-text-secondary">Rounds Completed</span>
            <div className="text-2xl font-bold text-white">
              {Math.floor(checkedExercises.size / exercises.length)}
            </div>
          </div>

          <div className="mb-4">
            <h3 className="text-lg font-semibold text-white mb-1">
              Exercises
            </h3>
            <p className="text-sm text-text-secondary">
              Complete as many rounds as possible
            </p>
          </div>

          {/* Responsive Layout */}
          {isMobile ? (
            // Compact List for Mobile
            <div className="bg-slate-800/30 rounded-lg border border-slate-700 overflow-hidden">
              {exercises.map((exercise, index) => (
                <AMRAPExerciseItem
                  key={exercise.id}
                  exercise={exercise}
                  exerciseNumber={index + 1}
                  variant="compact"
                  checked={checkedExercises.has(exercise.id)}
                  onToggle={() => onToggleExercise(exercise.id)}
                />
              ))}
            </div>
          ) : (
            // Card Grid for Desktop
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {exercises.map((exercise, index) => (
                <AMRAPExerciseItem
                  key={exercise.id}
                  exercise={exercise}
                  exerciseNumber={index + 1}
                  variant="card"
                  checked={checkedExercises.has(exercise.id)}
                  onToggle={() => onToggleExercise(exercise.id)}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </Card>
  )
}
