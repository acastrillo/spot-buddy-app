"use client"

import { useState } from "react"
import { useAuthStore } from "@/store"
import { Login } from "@/components/auth/login"
import { Header } from "@/components/layout/header"
import { MobileNav } from "@/components/layout/mobile-nav"
import { Button } from "@/components/ui/button"
import { IntervalTimer } from "@/components/timer/interval-timer"
import { HIITTimer } from "@/components/timer/hiit-timer"
import { Clock, Zap } from "lucide-react"

export default function TimerPage() {
  const { isAuthenticated } = useAuthStore()
  const [timerType, setTimerType] = useState<'interval' | 'hiit'>('interval')

  if (!isAuthenticated) {
    return <Login />
  }

  return (
    <>
      <Header />
      <main className="min-h-screen pb-20 md:pb-8">
        <div className="max-w-4xl mx-auto px-4 py-8">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-text-primary mb-2">
              Workout Timers
            </h1>
            <p className="text-text-secondary">
              Track your rest periods and HIIT workouts
            </p>
          </div>

          {/* Timer Type Selector */}
          <div className="flex items-center gap-3 mb-8">
            <Button
              variant={timerType === 'interval' ? 'default' : 'outline'}
              onClick={() => setTimerType('interval')}
              className="flex-1"
            >
              <Clock className="h-4 w-4 mr-2" />
              Interval Timer
            </Button>
            <Button
              variant={timerType === 'hiit' ? 'default' : 'outline'}
              onClick={() => setTimerType('hiit')}
              className="flex-1"
            >
              <Zap className="h-4 w-4 mr-2" />
              HIIT Timer
            </Button>
          </div>

          {/* Timer Display */}
          {timerType === 'interval' ? (
            <IntervalTimer initialDuration={60} />
          ) : (
            <HIITTimer />
          )}

          {/* Info */}
          <div className="mt-8 p-4 bg-surface rounded-lg border border-border">
            <h3 className="font-semibold text-text-primary mb-2">
              {timerType === 'interval' ? 'Interval Timer' : 'HIIT Timer'}
            </h3>
            <ul className="text-sm text-text-secondary space-y-1">
              {timerType === 'interval' ? (
                <>
                  <li>• Perfect for rest periods between sets</li>
                  <li>• Set custom durations up to 60 minutes</li>
                  <li>• Runs in background with notifications</li>
                  <li>• Audio alerts when time is up</li>
                </>
              ) : (
                <>
                  <li>• High-Intensity Interval Training timer</li>
                  <li>• Alternate between work and rest periods</li>
                  <li>• Popular presets: Tabata, EMOM, and more</li>
                  <li>• Track rounds and total workout time</li>
                </>
              )}
            </ul>
          </div>
        </div>
      </main>
      <MobileNav />
    </>
  )
}
