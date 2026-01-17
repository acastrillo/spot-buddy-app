"use client"

import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Play, Pause, RotateCcw, Bell } from "lucide-react"
import { cn } from "@/lib/utils"
import { formatTime } from "@/lib/amrap-migration"

interface AMRAPTimerCardProps {
  remainingSeconds: number
  totalSeconds: number
  blockLabel?: string // "Block 1 of 2" for multi-block workouts
  isRunning: boolean
  isCompleted?: boolean
  onPlayPause: () => void
  onReset: () => void
  soundEnabled?: boolean
  onToggleSound?: () => void
}

export function AMRAPTimerCard({
  remainingSeconds,
  totalSeconds,
  blockLabel,
  isRunning,
  isCompleted = false,
  onPlayPause,
  onReset,
  soundEnabled = true,
  onToggleSound,
}: AMRAPTimerCardProps) {
  // Calculate percentage remaining
  const percentage = (remainingSeconds / totalSeconds) * 100

  // Color-coded timer based on time remaining
  const getTimerColor = () => {
    if (percentage > 40) return "text-green-500"
    if (percentage > 20) return "text-yellow-500"
    return "text-red-500"
  }

  // Determine if we should show beep indicator (last 3 seconds)
  const showBeepIndicator = remainingSeconds <= 3 && remainingSeconds > 0 && isRunning

  // Pulsing animation for last 20% of time
  const shouldPulse = percentage <= 20 && isRunning

  return (
    <Card
      className={cn(
        "p-6 md:p-8 bg-gradient-to-br from-background to-muted/20 border-2",
        isCompleted && "border-red-500/70 bg-red-500/5"
      )}
    >
      <div className="space-y-4 md:space-y-6">
        {/* Block label for multi-block workouts */}
        {blockLabel && (
          <div className="flex justify-center">
            <Badge variant="secondary" className="text-sm px-4 py-1">
              {blockLabel}
            </Badge>
          </div>
        )}

        {/* Main timer display */}
        <div className="flex flex-col items-center space-y-2">
          <div
            className={cn(
              "text-7xl md:text-8xl font-bold tabular-nums transition-colors duration-300",
              getTimerColor(),
              shouldPulse && "animate-pulse"
            )}
          >
            {formatTime(remainingSeconds)}
          </div>

          {/* Progress bar */}
          <div className="w-full max-w-md h-2 bg-muted rounded-full overflow-hidden">
            <div
              className={cn(
                "h-full transition-all duration-300",
                percentage > 40 && "bg-green-500",
                percentage <= 40 && percentage > 20 && "bg-yellow-500",
                percentage <= 20 && "bg-red-500"
              )}
              style={{ width: `${percentage}%` }}
            />
          </div>

          {/* Total time indicator */}
          <p className="text-sm text-muted-foreground">
            of {formatTime(totalSeconds)}
          </p>
        </div>

        {/* Beep indicator (last 3 seconds) */}
        {showBeepIndicator && (
          <div className="flex items-center justify-center gap-2 text-red-500 animate-pulse">
            <Bell className="h-5 w-5" />
            <span className="font-medium">BEEP</span>
          </div>
        )}

        {isCompleted && (
          <div className="flex items-center justify-center gap-2 text-red-500">
            <span className="h-2.5 w-2.5 rounded-full bg-red-500 animate-pulse" />
            <span className="font-medium">Time&apos;s up</span>
          </div>
        )}

        {/* Controls */}
        <div className="flex items-center justify-center gap-3 flex-wrap">
          <Button
            size="lg"
            onClick={onPlayPause}
            className="px-8"
          >
            {isRunning ? (
              <>
                <Pause className="h-5 w-5 mr-2" />
                Pause
              </>
            ) : (
              <>
                <Play className="h-5 w-5 mr-2" />
                Start
              </>
            )}
          </Button>

          <Button
            size="lg"
            variant="outline"
            onClick={onReset}
          >
            <RotateCcw className="h-5 w-5 mr-2" />
            Reset
          </Button>

          {onToggleSound && (
            <Button
              size="lg"
              variant="ghost"
              onClick={onToggleSound}
              className="gap-2"
            >
              {soundEnabled ? "🔊" : "🔇"}
              <span className="text-sm">{soundEnabled ? "Sound On" : "Sound Off"}</span>
            </Button>
          )}
        </div>
      </div>
    </Card>
  )
}
