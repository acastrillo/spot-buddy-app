"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Play,
  Pause,
  RotateCcw,
  Settings,
  Zap,
  Coffee,
} from "lucide-react"
import {
  formatTime,
  playAlert,
  showNotification,
  saveTimerState,
  loadTimerState,
  clearTimerState,
  HIIT_PRESETS,
  type HIITState,
  type HIITConfig,
} from "@/lib/timer-utils"

const STORAGE_KEY = "hiit-timer-state";

export function HIITTimer() {
  const [config, setConfig] = useState<HIITConfig>(HIIT_PRESETS[0].config)
  const [currentRound, setCurrentRound] = useState(1)
  const [isWorkPhase, setIsWorkPhase] = useState(false)
  const [remaining, setRemaining] = useState(config.prepTime)
  const [isRunning, setIsRunning] = useState(false)
  const [isPrepPhase, setIsPrepPhase] = useState(true)
  const [showSettings, setShowSettings] = useState(false)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  // Load saved state
  useEffect(() => {
    const saved = loadTimerState<HIITState>(STORAGE_KEY)
    if (saved && saved.remaining > 0) {
      setConfig(saved.config)
      setCurrentRound(saved.currentRound)
      setIsWorkPhase(saved.isWorkPhase)
      setRemaining(saved.remaining)
    }
  }, [])

  // Save state
  useEffect(() => {
    const state: HIITState = {
      duration: isWorkPhase ? config.workDuration : config.restDuration,
      remaining,
      isRunning,
      isPaused: !isRunning && !isPrepPhase,
      startedAt: isRunning ? Date.now() : null,
      pausedAt: null,
      currentRound,
      isWorkPhase,
      config,
    }
    saveTimerState(STORAGE_KEY, state)
  }, [config, currentRound, isWorkPhase, remaining, isRunning, isPrepPhase])

  // Timer tick
  useEffect(() => {
    if (isRunning && remaining > 0) {
      intervalRef.current = setInterval(() => {
        setRemaining((prev) => {
          if (prev <= 1) {
            handlePhaseComplete()
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

  const handlePhaseComplete = useCallback(() => {
    playAlert()

    if (isPrepPhase) {
      // Prep → Work phase
      setIsPrepPhase(false)
      setIsWorkPhase(true)
      setRemaining(config.workDuration)
      showNotification('WORK!', {
        body: `Round ${currentRound}/${config.rounds} - Let's go!`,
      })
    } else if (isWorkPhase) {
      // Work → Rest phase
      setIsWorkPhase(false)
      setRemaining(config.restDuration)
      showNotification('REST', {
        body: `Round ${currentRound}/${config.rounds} - Take a break`,
      })
    } else {
      // Rest → Next round or complete
      if (currentRound < config.rounds) {
        setCurrentRound((prev) => prev + 1)
        setIsWorkPhase(true)
        setRemaining(config.workDuration)
        showNotification('WORK!', {
          body: `Round ${currentRound + 1}/${config.rounds} - Keep going!`,
        })
      } else {
        // Workout complete!
        setIsRunning(false)
        showNotification('Workout Complete! 🎉', {
          body: `Great job! You completed all ${config.rounds} rounds.`,
        })
        clearTimerState(STORAGE_KEY)
      }
    }
  }, [isPrepPhase, isWorkPhase, currentRound, config])

  const handleStart = () => {
    setIsRunning(true)
  }

  const handlePause = () => {
    setIsRunning(false)
  }

  const handleReset = () => {
    setIsRunning(false)
    setIsPrepPhase(true)
    setIsWorkPhase(false)
    setCurrentRound(1)
    setRemaining(config.prepTime)
    clearTimerState(STORAGE_KEY)
  }

  const loadPreset = (presetName: string) => {
    const preset = HIIT_PRESETS.find((p) => p.name === presetName)
    if (preset) {
      setConfig(preset.config)
      setRemaining(preset.config.prepTime)
      setIsPrepPhase(true)
      setIsWorkPhase(false)
      setCurrentRound(1)
      setIsRunning(false)
      setShowSettings(false)
    }
  }

  const totalDuration = config.prepTime + (config.workDuration + config.restDuration) * config.rounds
  const elapsedDuration = isPrepPhase
    ? config.prepTime - remaining
    : config.prepTime + (currentRound - 1) * (config.workDuration + config.restDuration) +
      (isWorkPhase ? config.workDuration - remaining : config.workDuration + config.restDuration - remaining)
  const progress = (elapsedDuration / totalDuration) * 100

  return (
    <div className="space-y-6">
      {/* Main Timer */}
      <Card className="bg-gradient-to-br from-surface to-surface-elevated">
        <CardContent className="p-8">
          <div className="flex flex-col items-center space-y-6">
            {/* Phase Indicator */}
            <div className="flex items-center gap-3">
              {isPrepPhase ? (
                <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-secondary/20 text-secondary border border-secondary/30">
                  <Settings className="h-5 w-5" />
                  <span className="font-semibold">GET READY</span>
                </div>
              ) : isWorkPhase ? (
                <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-primary/20 text-primary border border-primary/30 animate-pulse">
                  <Zap className="h-5 w-5" />
                  <span className="font-semibold">WORK</span>
                </div>
              ) : (
                <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-rest/20 text-rest border border-rest/30">
                  <Coffee className="h-5 w-5" />
                  <span className="font-semibold">REST</span>
                </div>
              )}
            </div>

            {/* Round Counter */}
            <div className="text-2xl font-bold text-text-primary">
              Round {currentRound} / {config.rounds}
            </div>

            {/* Main Time Display */}
            <div className="text-8xl font-bold text-text-primary tabular-nums">
              {formatTime(remaining)}
            </div>

            {/* Progress Bar */}
            <div className="w-full max-w-md">
              <div className="w-full bg-surface rounded-full h-3 overflow-hidden">
                <div
                  className={`h-3 rounded-full transition-all duration-300 ${
                    isPrepPhase ? 'bg-secondary' : isWorkPhase ? 'bg-primary' : 'bg-rest'
                  }`}
                  style={{ width: `${progress}%` }}
                />
              </div>
              <div className="flex justify-between mt-2 text-xs text-text-secondary">
                <span>{formatTime(Math.floor(elapsedDuration))}</span>
                <span>{formatTime(totalDuration)}</span>
              </div>
            </div>

            {/* Controls */}
            <div className="flex items-center gap-3">
              {!isRunning ? (
                <Button
                  size="lg"
                  onClick={handleStart}
                  className="w-32"
                >
                  <Play className="h-5 w-5 mr-2" />
                  Start
                </Button>
              ) : (
                <Button
                  size="lg"
                  variant="secondary"
                  onClick={handlePause}
                  className="w-32"
                >
                  <Pause className="h-5 w-5 mr-2" />
                  Pause
                </Button>
              )}
              <Button
                size="lg"
                variant="outline"
                onClick={handleReset}
                className="w-32"
              >
                <RotateCcw className="h-5 w-5 mr-2" />
                Reset
              </Button>
              <Button
                size="lg"
                variant="outline"
                onClick={() => setShowSettings(!showSettings)}
              >
                <Settings className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Settings */}
      {showSettings && (
        <Card>
          <CardHeader>
            <CardTitle>Timer Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Presets */}
            <div className="space-y-2">
              <Label>Presets</Label>
              <div className="grid grid-cols-2 gap-2">
                {HIIT_PRESETS.map((preset) => (
                  <Button
                    key={preset.name}
                    variant="outline"
                    onClick={() => loadPreset(preset.name)}
                    disabled={isRunning}
                  >
                    {preset.name}
                  </Button>
                ))}
              </div>
            </div>

            {/* Custom Config */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="work">Work (seconds)</Label>
                <Input
                  id="work"
                  type="number"
                  value={config.workDuration}
                  onChange={(e) =>
                    setConfig({ ...config, workDuration: Number(e.target.value) })
                  }
                  disabled={isRunning}
                  min={5}
                  max={300}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="rest">Rest (seconds)</Label>
                <Input
                  id="rest"
                  type="number"
                  value={config.restDuration}
                  onChange={(e) =>
                    setConfig({ ...config, restDuration: Number(e.target.value) })
                  }
                  disabled={isRunning}
                  min={5}
                  max={300}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="rounds">Rounds</Label>
                <Input
                  id="rounds"
                  type="number"
                  value={config.rounds}
                  onChange={(e) =>
                    setConfig({ ...config, rounds: Number(e.target.value) })
                  }
                  disabled={isRunning}
                  min={1}
                  max={50}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="prep">Prep Time (seconds)</Label>
                <Input
                  id="prep"
                  type="number"
                  value={config.prepTime}
                  onChange={(e) =>
                    setConfig({ ...config, prepTime: Number(e.target.value) })
                  }
                  disabled={isRunning}
                  min={0}
                  max={60}
                />
              </div>
            </div>

            <div className="text-sm text-text-secondary">
              Total workout time: {formatTime(totalDuration)}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
