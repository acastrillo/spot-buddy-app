"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter, useParams } from "next/navigation"
import { useAuthStore } from "@/store"
import { Login } from "@/components/auth/login"
import { Header } from "@/components/layout/header"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { TIMER_TEMPLATES, type TimerParams } from "@/timers"
import { WorkoutTimer } from "@/components/timer/workout-timer"
import {
  ArrowLeft,
  Timer,
  Sparkles,
  CheckCircle,
  Edit2,
  Clock,
  Trophy,
  Loader2
} from "lucide-react"

interface Workout {
  id: string
  title: string
  description: string
  exercises: any[]
  totalDuration: number
  difficulty: string
  timerConfig?: {
    params: TimerParams
    aiGenerated?: boolean
    reason?: string
  }
}

export default function WorkoutSessionPage() {
  const { isAuthenticated, user } = useAuthStore()
  const router = useRouter()
  const params = useParams()
  const [workout, setWorkout] = useState<Workout | null>(null)
  const [loading, setLoading] = useState(true)
  const [sessionStartTime, setSessionStartTime] = useState<number | null>(null)
  const [showCompletionDialog, setShowCompletionDialog] = useState(false)
  const [showEditTimer, setShowEditTimer] = useState(false)
  const [selectedTimerConfig, setSelectedTimerConfig] = useState<{
    params: TimerParams
    aiGenerated?: boolean
    reason?: string
  } | null>(null)
  const [sessionDuration, setSessionDuration] = useState(0)
  const sessionIntervalRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    const workoutId = params?.id as string
    if (workoutId && user?.id) {
      loadWorkout(workoutId)
      // Start session timer
      const startTime = Date.now()
      setSessionStartTime(startTime)

      // Update session duration every second
      sessionIntervalRef.current = setInterval(() => {
        setSessionDuration(Math.floor((Date.now() - startTime) / 1000))
      }, 1000)
    }

    return () => {
      if (sessionIntervalRef.current) {
        clearInterval(sessionIntervalRef.current)
      }
    }
  }, [params?.id, user?.id])

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
        }
        setWorkout(transformedWorkout)
        setSelectedTimerConfig(dbWorkout.timerConfig || null)
      } else {
        // Fallback to localStorage
        const workouts = JSON.parse(localStorage.getItem('workouts') || '[]')
        const found = workouts.find((w: Workout) => w.id === workoutId)
        setWorkout(found || null)
        setSelectedTimerConfig(found?.timerConfig || null)
      }
    } catch (error) {
      console.error('Error loading workout:', error)
      const workouts = JSON.parse(localStorage.getItem('workouts') || '[]')
      const found = workouts.find((w: Workout) => w.id === workoutId)
      setWorkout(found || null)
      setSelectedTimerConfig(found?.timerConfig || null)
    } finally {
      setLoading(false)
    }
  }

  const handleDone = () => {
    if (sessionIntervalRef.current) {
      clearInterval(sessionIntervalRef.current)
    }
    setShowCompletionDialog(true)
  }

  const handleMarkCompleted = async () => {
    if (!workout || sessionStartTime === null) return

    const completedAt = new Date().toISOString()
    const todayIso = completedAt.split('T')[0]
    const durationMinutes = Math.floor(sessionDuration / 60)

    // Save to localStorage
    const existing = JSON.parse(localStorage.getItem('completedWorkouts') || '[]')
    const newEntry = {
      id: Date.now().toString(),
      workoutId: workout.id,
      completedAt,
      completedDate: todayIso,
      durationSeconds: sessionDuration,
      durationMinutes,
    }
    const updated = [...existing, newEntry]
    localStorage.setItem('completedWorkouts', JSON.stringify(updated))

    // Save to DynamoDB if user is authenticated
    if (user?.id) {
      try {
        await fetch(`/api/workouts/${workout.id}/complete`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            completedAt,
            durationSeconds: sessionDuration,
          }),
        })
      } catch (error) {
        console.error('Error saving completion to DynamoDB:', error)
      }
    }

    // Dispatch events for updates
    window.dispatchEvent(new Event('workoutsUpdated'))
    window.dispatchEvent(new Event('calendarUpdated'))

    // Navigate back to workout detail page
    router.push(`/workout/${workout.id}`)
  }

  const handleEndWithoutCompletion = () => {
    if (sessionIntervalRef.current) {
      clearInterval(sessionIntervalRef.current)
    }
    router.push(`/workout/${workout!.id}`)
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

  const handleSelectTimer = (templateId: string) => {
    if (templateId === 'none') {
      setSelectedTimerConfig(null)
    } else if (templateId === 'custom') {
      // Keep current configuration
    } else {
      const template = TIMER_TEMPLATES.find((t) => t.id === templateId)
      if (template) {
        setSelectedTimerConfig({
          params: template.defaultParams,
          aiGenerated: false,
        })
      }
    }
    setShowEditTimer(false)
  }

  if (!isAuthenticated) {
    return <Login />
  }

  if (loading) {
    return (
      <>
        <Header />
        <main className="min-h-screen flex items-center justify-center">
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

  return (
    <>
      <Header />
      <main className="min-h-screen pb-20">
        <div className="max-w-4xl mx-auto px-4 py-8">
          {/* Header */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => router.push(`/workout/${workout.id}`)}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Workout
              </Button>
              <Button
                onClick={handleDone}
                size="lg"
                className="bg-green-600 hover:bg-green-700"
              >
                <CheckCircle className="h-5 w-5 mr-2" />
                Done
              </Button>
            </div>

            <h1 className="text-2xl font-bold text-text-primary mb-2">
              {workout.title}
            </h1>

            {/* Session Duration */}
            <Card className="mb-6">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-text-secondary">
                    <Clock className="h-5 w-5" />
                    <span className="text-sm">Session Time:</span>
                  </div>
                  <div className="text-3xl font-bold text-primary tabular-nums">
                    {formatTime(sessionDuration)}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Timer Section */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Timer className="h-5 w-5" />
                  <CardTitle>Workout Timer</CardTitle>
                  {selectedTimerConfig?.aiGenerated && (
                    <Badge variant="secondary" className="flex items-center gap-1">
                      <Sparkles className="h-3 w-3" />
                      AI-Suggested
                    </Badge>
                  )}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowEditTimer(!showEditTimer)}
                >
                  <Edit2 className="h-4 w-4 mr-2" />
                  Edit Timer
                </Button>
              </div>
              {selectedTimerConfig?.reason && (
                <p className="text-sm text-text-secondary mt-2">
                  {selectedTimerConfig.reason}
                </p>
              )}
            </CardHeader>
            <CardContent>
              {showEditTimer && (
                <div className="mb-6 p-4 border border-border rounded-lg bg-surface">
                  <label className="block text-sm font-medium mb-2">
                    Select Timer Configuration
                  </label>
                  <Select
                    value={selectedTimerConfig ? "custom" : "none"}
                    onValueChange={handleSelectTimer}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="No timer" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No timer</SelectItem>
                      {selectedTimerConfig && (
                        <SelectItem value="custom">
                          {selectedTimerConfig.aiGenerated
                            ? "AI-Suggested Timer"
                            : "Custom Timer"}
                        </SelectItem>
                      )}
                      {TIMER_TEMPLATES.map((template) => (
                        <SelectItem key={template.id} value={template.id}>
                          {template.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {selectedTimerConfig ? (
                <WorkoutTimer
                  params={selectedTimerConfig.params}
                  persistKey={`workout-${workout.id}-session-timer`}
                />
              ) : (
                <div className="text-center py-12">
                  <Timer className="h-12 w-12 text-text-secondary mx-auto mb-4" />
                  <p className="text-text-secondary mb-4">
                    No timer configured for this workout
                  </p>
                  <Button
                    variant="outline"
                    onClick={() => setShowEditTimer(true)}
                  >
                    <Edit2 className="h-4 w-4 mr-2" />
                    Add Timer
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>

      {/* Completion Dialog */}
      <Dialog open={showCompletionDialog} onOpenChange={setShowCompletionDialog}>
        <DialogContent>
          <DialogHeader>
            <div className="flex items-center justify-center mb-4">
              <div className="bg-green-100 rounded-full p-4">
                <Trophy className="h-12 w-12 text-green-600" />
              </div>
            </div>
            <DialogTitle className="text-center text-2xl">
              Great Work!
            </DialogTitle>
            <DialogDescription className="text-center text-lg">
              You completed this workout in <span className="font-bold text-primary">{formatTime(sessionDuration)}</span>
            </DialogDescription>
          </DialogHeader>
          <div className="my-4 p-4 bg-surface rounded-lg">
            <div className="flex items-center justify-between">
              <span className="text-text-secondary">Workout:</span>
              <span className="font-medium">{workout.title}</span>
            </div>
            <div className="flex items-center justify-between mt-2">
              <span className="text-text-secondary">Duration:</span>
              <span className="font-medium">{Math.floor(sessionDuration / 60)} minutes</span>
            </div>
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={handleEndWithoutCompletion}
              className="w-full sm:w-auto"
            >
              End Without Saving
            </Button>
            <Button
              variant="outline"
              onClick={() => setShowCompletionDialog(false)}
              className="w-full sm:w-auto"
            >
              Cancel
            </Button>
            <Button
              onClick={handleMarkCompleted}
              className="w-full sm:w-auto bg-green-600 hover:bg-green-700"
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              Mark as Completed
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
