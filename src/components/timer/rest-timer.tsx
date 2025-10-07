"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Clock, Play, Pause, X } from "lucide-react"
import {
  formatTime,
  playAlert,
  REST_PRESETS,
} from "@/lib/timer-utils"

interface RestTimerProps {
  onClose?: () => void;
  autoStart?: boolean;
}

export function RestTimer({ onClose, autoStart = false }: RestTimerProps) {
  const [duration, setDuration] = useState(60)
  const [remaining, setRemaining] = useState(60)
  const [isRunning, setIsRunning] = useState(autoStart)
  const [isExpanded, setIsExpanded] = useState(false)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  // Timer tick
  useEffect(() => {
    if (isRunning && remaining > 0) {
      intervalRef.current = setInterval(() => {
        setRemaining((prev) => {
          if (prev <= 1) {
            setIsRunning(false)
            playAlert()
            return 0
          }
          return prev - 1
        })
      }, 1000)
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [isRunning, remaining])

  const startTimer = (seconds: number) => {
    setDuration(seconds)
    setRemaining(seconds)
    setIsRunning(true)
    setIsExpanded(false)
  }

  const toggleTimer = () => {
    setIsRunning(!isRunning)
  }

  const reset = () => {
    setIsRunning(false)
    setRemaining(duration)
  }

  if (!isExpanded && !isRunning && remaining === duration) {
    // Collapsed preset buttons
    return (
      <Card className="fixed bottom-20 right-4 md:bottom-8 md:right-8 z-50 shadow-lg">
        <div className="p-3 space-y-2">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2 text-sm font-medium text-text-primary">
              <Clock className="h-4 w-4" />
              <span>Rest Timer</span>
            </div>
            {onClose && (
              <Button
                size="sm"
                variant="ghost"
                onClick={onClose}
                className="h-6 w-6 p-0"
              >
                <X className="h-3 w-3" />
              </Button>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {REST_PRESETS.map((preset) => (
              <Button
                key={preset.value}
                size="sm"
                variant="outline"
                onClick={() => startTimer(preset.value)}
                className="h-8 text-xs"
              >
                {preset.label}
              </Button>
            ))}
          </div>
        </div>
      </Card>
    )
  }

  // Running timer display
  return (
    <Card className="fixed bottom-20 right-4 md:bottom-8 md:right-8 z-50 shadow-lg">
      <div className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2 text-sm font-medium text-text-primary">
            <Clock className="h-4 w-4" />
            <span>Rest Timer</span>
          </div>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              reset()
              setIsExpanded(false)
              onClose?.()
            }}
            className="h-6 w-6 p-0"
          >
            <X className="h-3 w-3" />
          </Button>
        </div>

        {/* Timer Display */}
        <div className="flex flex-col items-center space-y-3">
          <div className="text-4xl font-bold text-text-primary tabular-nums">
            {formatTime(remaining)}
          </div>

          {/* Progress Bar */}
          <div className="w-full bg-surface rounded-full h-2">
            <div
              className="bg-primary h-2 rounded-full transition-all duration-300"
              style={{
                width: `${((duration - remaining) / duration) * 100}%`,
              }}
            />
          </div>

          {/* Controls */}
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant={isRunning ? "secondary" : "default"}
              onClick={toggleTimer}
              disabled={remaining === 0}
              className="w-20"
            >
              {isRunning ? (
                <>
                  <Pause className="h-3 w-3 mr-1" />
                  Pause
                </>
              ) : (
                <>
                  <Play className="h-3 w-3 mr-1" />
                  Start
                </>
              )}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={reset}
              className="w-20"
            >
              Reset
            </Button>
          </div>

          {/* Quick restart buttons */}
          {remaining === 0 && (
            <div className="flex flex-wrap gap-2 pt-2 border-t border-border">
              <span className="text-xs text-text-secondary w-full text-center">
                Start another rest:
              </span>
              {REST_PRESETS.slice(0, 4).map((preset) => (
                <Button
                  key={preset.value}
                  size="sm"
                  variant="outline"
                  onClick={() => startTimer(preset.value)}
                  className="h-7 text-xs flex-1"
                >
                  {preset.label}
                </Button>
              ))}
            </div>
          )}
        </div>
      </div>
    </Card>
  )
}
