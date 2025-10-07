"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  Play,
  Pause,
  RotateCcw,
  Bell,
  BellOff,
  Volume2,
  VolumeX,
} from "lucide-react"
import {
  formatTime,
  calculateProgress,
  playAlert,
  showNotification,
  requestNotificationPermission,
  saveTimerState,
  loadTimerState,
  clearTimerState,
  type TimerState,
} from "@/lib/timer-utils"

interface IntervalTimerProps {
  initialDuration?: number; // Initial duration in seconds
  onComplete?: () => void;
  autoStart?: boolean;
  showControls?: boolean;
  className?: string;
}

const STORAGE_KEY = "interval-timer-state";

export function IntervalTimer({
  initialDuration = 60,
  onComplete,
  autoStart = false,
  showControls = true,
  className = "",
}: IntervalTimerProps) {
  const [duration, setDuration] = useState(initialDuration)
  const [remaining, setRemaining] = useState(initialDuration)
  const [isRunning, setIsRunning] = useState(autoStart)
  const [soundEnabled, setSoundEnabled] = useState(true)
  const [notificationsEnabled, setNotificationsEnabled] = useState(false)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  // Load saved state on mount
  useEffect(() => {
    const saved = loadTimerState<TimerState>(STORAGE_KEY)
    if (saved && saved.remaining > 0) {
      setDuration(saved.duration)
      setRemaining(saved.remaining)
      // Don't auto-resume, user must click play
    }
  }, [])

  // Save state on changes
  useEffect(() => {
    const state: TimerState = {
      duration,
      remaining,
      isRunning,
      isPaused: !isRunning && remaining < duration,
      startedAt: isRunning ? Date.now() : null,
      pausedAt: !isRunning ? Date.now() : null,
    }
    saveTimerState(STORAGE_KEY, state)
  }, [duration, remaining, isRunning])

  // Timer tick
  useEffect(() => {
    if (isRunning && remaining > 0) {
      intervalRef.current = setInterval(() => {
        setRemaining((prev) => {
          if (prev <= 1) {
            // Timer complete
            setIsRunning(false)
            handleComplete()
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

  const handleComplete = useCallback(() => {
    if (soundEnabled) {
      playAlert()
    }
    if (notificationsEnabled) {
      showNotification('Timer Complete!', {
        body: `Your ${formatTime(duration)} timer has finished.`,
      })
    }
    onComplete?.()
    clearTimerState(STORAGE_KEY)
  }, [soundEnabled, notificationsEnabled, duration, onComplete])

  const handleStart = () => {
    setIsRunning(true)
  }

  const handlePause = () => {
    setIsRunning(false)
  }

  const handleReset = () => {
    setIsRunning(false)
    setRemaining(duration)
    clearTimerState(STORAGE_KEY)
  }

  const handleDurationChange = (newDuration: number) => {
    if (newDuration > 0 && newDuration <= 3600) { // Max 1 hour
      setDuration(newDuration)
      setRemaining(newDuration)
      setIsRunning(false)
    }
  }

  const toggleNotifications = async () => {
    if (!notificationsEnabled) {
      const granted = await requestNotificationPermission()
      setNotificationsEnabled(granted)
    } else {
      setNotificationsEnabled(false)
    }
  }

  const progress = calculateProgress(duration, remaining)
  const circumference = 2 * Math.PI * 120 // radius of 120
  const strokeDashoffset = circumference - (progress / 100) * circumference

  return (
    <Card className={className}>
      <CardContent className="p-6">
        <div className="flex flex-col items-center space-y-6">
          {/* Circular Progress */}
          <div className="relative w-64 h-64">
            <svg className="w-full h-full transform -rotate-90">
              {/* Background circle */}
              <circle
                cx="128"
                cy="128"
                r="120"
                stroke="currentColor"
                strokeWidth="8"
                fill="none"
                className="text-surface"
              />
              {/* Progress circle */}
              <circle
                cx="128"
                cy="128"
                r="120"
                stroke="currentColor"
                strokeWidth="8"
                fill="none"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                className="text-primary transition-all duration-300"
              />
            </svg>
            {/* Time display */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <div className="text-6xl font-bold text-text-primary tabular-nums">
                  {formatTime(remaining)}
                </div>
                <div className="text-sm text-text-secondary mt-2">
                  {isRunning ? 'Running' : remaining < duration ? 'Paused' : 'Ready'}
                </div>
              </div>
            </div>
          </div>

          {/* Controls */}
          {showControls && (
            <>
              <div className="flex items-center space-x-3">
                {!isRunning ? (
                  <Button
                    size="lg"
                    onClick={handleStart}
                    disabled={remaining === 0}
                    className="w-24"
                  >
                    <Play className="h-5 w-5 mr-2" />
                    Start
                  </Button>
                ) : (
                  <Button
                    size="lg"
                    variant="secondary"
                    onClick={handlePause}
                    className="w-24"
                  >
                    <Pause className="h-5 w-5 mr-2" />
                    Pause
                  </Button>
                )}
                <Button
                  size="lg"
                  variant="outline"
                  onClick={handleReset}
                  className="w-24"
                >
                  <RotateCcw className="h-5 w-5 mr-2" />
                  Reset
                </Button>
              </div>

              {/* Duration input */}
              <div className="flex items-center space-x-3">
                <label className="text-sm text-text-secondary">Duration:</label>
                <Input
                  type="number"
                  value={Math.floor(duration / 60)}
                  onChange={(e) => handleDurationChange(Number(e.target.value) * 60)}
                  min={1}
                  max={60}
                  disabled={isRunning}
                  className="w-20 text-center"
                />
                <span className="text-sm text-text-secondary">minutes</span>
              </div>

              {/* Settings */}
              <div className="flex items-center space-x-2">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setSoundEnabled(!soundEnabled)}
                  className="gap-2"
                >
                  {soundEnabled ? (
                    <Volume2 className="h-4 w-4" />
                  ) : (
                    <VolumeX className="h-4 w-4" />
                  )}
                  <span className="text-xs">Sound</span>
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={toggleNotifications}
                  className="gap-2"
                >
                  {notificationsEnabled ? (
                    <Bell className="h-4 w-4" />
                  ) : (
                    <BellOff className="h-4 w-4" />
                  )}
                  <span className="text-xs">Notify</span>
                </Button>
              </div>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
