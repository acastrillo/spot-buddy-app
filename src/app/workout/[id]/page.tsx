"use client"

import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import Link from "next/link"
import { useAuthStore } from "@/store"
import { Login } from "@/components/auth/login"
import { Header } from "@/components/layout/header"
import { MobileNav } from "@/components/layout/mobile-nav"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import StreakPopup from "@/components/ui/streak-popup"
import { RestTimer } from "@/components/timer/rest-timer"
import { EnhanceWithAIButton } from "@/components/ai/enhance-button"
import {
  ArrowLeft,
  Clock,
  Target,
  User,
  ExternalLink,
  Edit,
  Play,
  AlertCircle,
  Loader2,
  Timer
} from "lucide-react"

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
  content: string
  author?: any
  createdAt: string
  updatedAt?: string
  source: string
  type: string
  totalDuration: number
  difficulty: string
  tags: string[]
  aiEnhanced?: boolean
  workoutType?: 'standard' | 'emom' | 'amrap' | 'rounds' | 'ladder' | 'tabata'
  structure?: {
    rounds?: number
    timePerRound?: number
    timeLimit?: number
    totalTime?: number
    pattern?: string
  }
}

export default function WorkoutViewPage() {
  const { isAuthenticated, user } = useAuthStore()
  const router = useRouter()
  const params = useParams()
  const [workout, setWorkout] = useState<Workout | null>(null)
  const [loading, setLoading] = useState(true)
  const [showStreakPopup, setShowStreakPopup] = useState(false)
  const [streakCount, setStreakCount] = useState(0)
  const [popupDateLabel, setPopupDateLabel] = useState<string | undefined>(undefined)
  const [showRestTimer, setShowRestTimer] = useState(false)

  useEffect(() => {
    const workoutId = params?.id as string
    if (workoutId && user?.id) {
      loadWorkout(workoutId)
    }
  }, [params?.id, user?.id])

  const loadWorkout = async (workoutId: string) => {
    setLoading(true)
    try {
      // Load from API (which calls DynamoDB on the server)
      const response = await fetch(`/api/workouts/${workoutId}`)

      if (response.ok) {
        const { workout: dbWorkout } = await response.json()

        // Transform DynamoDB workout to display format
        const transformedWorkout: Workout = {
          id: dbWorkout.workoutId,
          title: dbWorkout.title,
          description: dbWorkout.description || '',
          exercises: dbWorkout.exercises || [],
          content: dbWorkout.content || '',
          author: dbWorkout.author,
          createdAt: dbWorkout.createdAt,
          updatedAt: dbWorkout.updatedAt,
          source: dbWorkout.source || '',
          type: dbWorkout.type || 'manual',
          totalDuration: dbWorkout.totalDuration || 0,
          difficulty: dbWorkout.difficulty || 'medium',
          tags: dbWorkout.tags || [],
          aiEnhanced: dbWorkout.aiEnhanced,
          workoutType: dbWorkout.workoutType,
          structure: dbWorkout.structure,
        }
        setWorkout(transformedWorkout)
      } else {
        // Fallback to localStorage if API fails
        const workouts = JSON.parse(localStorage.getItem('workouts') || '[]')
        const found = workouts.find((w: Workout) => w.id === workoutId)
        setWorkout(found || null)
      }
    } catch (error) {
      console.error('Error loading workout:', error)
      // Fallback to localStorage on error
      const workouts = JSON.parse(localStorage.getItem('workouts') || '[]')
      const found = workouts.find((w: Workout) => w.id === workoutId)
      setWorkout(found || null)
    } finally {
      setLoading(false)
    }
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
            <p className="text-text-secondary">Loading workout...</p>
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
            <AlertCircle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-text-primary mb-2">
              Workout Not Found
            </h2>
            <p className="text-text-secondary mb-4">
              The workout you're looking for doesn't exist or has been deleted.
            </p>
            <Button onClick={() => router.push('/')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Home
            </Button>
          </div>
        </main>
      </>
    )
  }

  const formatDuration = (minutes: number) => {
    if (minutes < 60) return `${minutes} min`
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`
  }

  const computeStreak = (allDates: string[], anchorIso: string) => {
    const unique = Array.from(new Set(allDates)).sort((a, b) => new Date(b).getTime() - new Date(a).getTime())
    let streak = 0
    let cursor = anchorIso
    for (const ds of unique) {
      if (ds === cursor) {
        streak++
        const prev = new Date(cursor)
        prev.setDate(prev.getDate() - 1)
        cursor = prev.toISOString().split('T')[0]
      } else if (new Date(ds) < new Date(cursor)) {
        break
      }
    }
    return streak
  }

  const markCompletedToday = () => {
    if (!workout) return
    const todayIso = new Date().toISOString().split('T')[0]
    const completedAt = new Date().toISOString()
    const existing = JSON.parse(localStorage.getItem('completedWorkouts') || '[]')
    const newEntry = {
      id: Date.now().toString(),
      workoutId: workout.id,
      completedAt,
      completedDate: todayIso,
    }
    const updated = [...existing, newEntry]
    localStorage.setItem('completedWorkouts', JSON.stringify(updated))
    window.dispatchEvent(new Event('workoutsUpdated'))

    const streak = computeStreak(updated.map((c: any) => c.completedDate), todayIso)
    setStreakCount(streak)
    setPopupDateLabel(new Date(todayIso).toLocaleDateString())
    setShowStreakPopup(true)
  }

  return (
    <>
      <Header />
      <main className="min-h-screen pb-20 md:pb-8">
        <div className="max-w-4xl mx-auto px-4 py-8">
          <StreakPopup 
            show={showStreakPopup} 
            onClose={() => setShowStreakPopup(false)}
            streak={streakCount}
            dateLabel={popupDateLabel}
          />
          {/* Header */}
          <div className="mb-6">
            {/* Back button and title */}
            <div className="flex items-start gap-3 mb-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => router.back()}
                className="flex-shrink-0 mt-1"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div className="flex-1 min-w-0">
                <h1 className="text-xl md:text-2xl font-bold text-text-primary break-words">
                  {workout.title}
                </h1>
                <p className="text-sm text-text-secondary break-words">
                  {workout.description}
                </p>
              </div>
            </div>

            {/* Action buttons - responsive grid layout */}
            <div className="grid grid-cols-2 md:flex md:flex-wrap gap-2 mb-4">
              <EnhanceWithAIButton
                workoutId={workout.id}
                onEnhanced={() => loadWorkout(workout.id)}
                variant="outline"
                size="sm"
                aiEnhanced={workout.aiEnhanced}
                className="w-full md:w-auto"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  // Navigate to card view
                  const workoutForEdit = {
                    id: workout.id,
                    title: workout.title,
                    content: workout.content,
                    llmData: {
                      exercises: workout.exercises,
                      workoutType: workout.workoutType,
                      structure: workout.structure,
                    },
                    createdAt: workout.createdAt,
                    source: workout.source,
                    type: workout.type,
                  }
                  sessionStorage.setItem('workoutToEdit', JSON.stringify(workoutForEdit))
                  router.push('/add/edit')
                }}
                className="w-full md:w-auto"
              >
                <Play className="h-4 w-4 md:mr-2" />
                <span className="hidden sm:inline">View Cards</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowRestTimer(!showRestTimer)}
                className="w-full md:w-auto"
              >
                <Timer className="h-4 w-4 md:mr-2" />
                <span className="hidden sm:inline">Rest Timer</span>
              </Button>
              <Link href={`/workout/${workout.id}/edit`} className="w-full md:w-auto">
                <Button variant="outline" size="sm" className="w-full">
                  <Edit className="h-4 w-4 md:mr-2" />
                  <span className="hidden sm:inline">Edit</span>
                </Button>
              </Link>
            </div>

            {/* Workout Meta */}
            <div className="flex flex-wrap items-center gap-4 mb-4">
              <div className="flex items-center space-x-1 text-text-secondary">
                <Clock className="h-4 w-4" />
                <span className="text-sm">{formatDuration(workout.totalDuration)}</span>
              </div>
              
              <div className="flex items-center space-x-1 text-text-secondary">
                <Target className="h-4 w-4" />
                <span className="text-sm capitalize">{workout.difficulty}</span>
              </div>
              
              {workout.author && (
                <div className="flex items-center space-x-1 text-text-secondary">
                  <User className="h-4 w-4" />
                  <span className="text-sm">@{workout.author.username}</span>
                </div>
              )}
              
            </div>

            {/* Quick actions */}
            <div className="flex gap-2 mt-2">
              <Button onClick={markCompletedToday} className="w-full md:w-auto flex items-center justify-center gap-2">
                <Play className="h-4 w-4" />
                <span>Mark Completed Today</span>
              </Button>
            </div>

          </div>

          {/* Exercises */}
          <Card>
            <CardHeader>
              <CardTitle>Exercises ({workout.exercises.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {workout.exercises.map((exercise, idx) => {
                  const setDetails =
                    Array.isArray(exercise.setDetails) && exercise.setDetails.length > 0
                      ? exercise.setDetails
                      : null;

                  return (
                    <div
                      key={exercise.id}
                      className="rounded-lg border border-border bg-surface p-4 md:flex md:items-start md:justify-between"
                    >
                      <div className="flex items-start space-x-4">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                          {idx + 1}
                        </div>
                        <div>
                          <h3 className="font-medium text-text-primary capitalize">
                            {exercise.name}
                          </h3>
                          {exercise.notes && (
                            <p className="mt-1 text-xs text-text-secondary">{exercise.notes}</p>
                          )}
                          {setDetails && (
                            <div className="mt-3 space-y-2 rounded-lg bg-background/60 p-3 text-xs text-text-secondary">
                              {setDetails.map((detail, detailIdx) => (
                                <div
                                  key={detail?.id ?? `${exercise.id}-${detailIdx}`}
                                  className="flex items-center justify-between gap-3"
                                >
                                  <span className="uppercase tracking-wide text-[10px] text-text-secondary/70">
                                    Set {detailIdx + 1}
                                  </span>
                                  <div className="flex items-center gap-4 text-sm text-text-primary">
                                    <span>{detail?.reps || exercise.reps || "-"} reps</span>
                                    <span className="text-text-secondary">
                                      {detail?.weight || exercise.weight || "Bodyweight"}
                                    </span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                          {exercise.restSeconds && exercise.restSeconds > 0 && (
                            <p className="mt-2 text-xs text-text-secondary">
                              Rest {exercise.restSeconds}s between sets
                            </p>
                          )}
                        </div>
                      </div>

                      {!setDetails && (
                        <div className="mt-4 flex items-center space-x-6 text-sm text-text-secondary md:mt-0">
                          {exercise.sets > 1 && (
                            <div className="text-center">
                              <div className="font-medium text-text-primary">{exercise.sets}</div>
                              <div className="text-xs">sets</div>
                            </div>
                          )}

                          {exercise.reps && (
                            <div className="text-center">
                              <div className="font-medium text-text-primary">{exercise.reps}</div>
                              <div className="text-xs">reps</div>
                            </div>
                          )}

                          {exercise.weight && (
                            <div className="text-center">
                              <div className="font-medium text-text-primary">{exercise.weight}</div>
                              <div className="text-xs">weight</div>
                            </div>
                          )}

                          {exercise.restSeconds && exercise.restSeconds > 0 && (
                            <div className="text-center">
                              <div className="font-medium text-text-primary">{exercise.restSeconds}s</div>
                              <div className="text-xs">rest</div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Source Info */}
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="text-sm">Source Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-4 text-sm">
                <div>
                  <div className="text-text-secondary mb-1">Imported from</div>
                  <div className="text-text-primary">
                    {workout.type === 'url' ? 'Instagram' : workout.type === 'manual' ? 'Manual Entry' : 'Image Upload'}
                  </div>
                </div>
                
                <div>
                  <div className="text-text-secondary mb-1">Created</div>
                  <div className="text-text-primary">
                    {new Date(workout.createdAt).toLocaleDateString()}
                  </div>
                </div>
                
                {workout.source !== 'manual' && (
                  <div className="md:col-span-2">
                    <div className="text-text-secondary mb-1">Source URL</div>
                    <div className="flex items-center space-x-2">
                      <a
                        href={workout.source}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-text-primary text-xs font-mono truncate hover:text-primary transition-colors flex-1 min-w-0"
                        title={workout.source}
                      >
                        {workout.source}
                      </a>
                      <Button variant="outline" size="sm" asChild className="flex-shrink-0">
                        <a href={workout.source} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
      <MobileNav />
      {/* Rest Timer Widget */}
      {showRestTimer && (
        <RestTimer onClose={() => setShowRestTimer(false)} />
      )}
    </>
  )
}
