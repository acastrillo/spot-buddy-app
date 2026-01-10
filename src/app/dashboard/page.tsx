"use client"

import { useState, useEffect, useRef } from "react"
import { useAuthStore } from "@/store"
import { Login } from "@/components/auth/login"
import { Header } from "@/components/layout/header"
import { MobileNav } from "@/components/layout/mobile-nav"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import type { WorkoutStats } from "@/lib/workout-stats"
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts"
import {
  Trophy,
  TrendingUp,
  Dumbbell,
  Calendar,
  Flame,
  Activity,
  Target,
  Award,
  Sparkles,
  Loader2,
  ChevronRight,
  Clock
} from "lucide-react"
import { LoadingSpinner } from "@/components/ui/loading-spinner"
import { useRouter } from "next/navigation"

const formatVolume = (volume: number): string => {
  if (volume >= 1_000_000) {
    return `${(volume / 1_000_000).toFixed(1)}M`
  }

  if (volume >= 10_000) {
    return `${Math.round(volume / 1_000)}k`
  }

  if (volume >= 1_000) {
    return `${(volume / 1_000).toFixed(1)}k`
  }

  return volume.toString()
}

export default function DashboardPage() {
  const { isAuthenticated, user } = useAuthStore()
  const router = useRouter()
  const [stats, setStats] = useState<WorkoutStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const hasLoadedStatsRef = useRef(false)
  const [workoutOfWeek, setWorkoutOfWeek] = useState<any | null>(null)
  const [isLoadingWOW, setIsLoadingWOW] = useState(false)

  // Helper to get the current week's Monday date
  const getWeekStartDate = (): string => {
    const now = new Date()
    const dayOfWeek = now.getDay()
    const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
    const monday = new Date(now)
    monday.setDate(now.getDate() + diff)
    return monday.toISOString().split('T')[0]
  }

  // Handler to generate Workout of the Week when user clicks
  const handleGenerateWOW = async () => {
    if (!user?.id) return

    setIsLoadingWOW(true)

    try {
      const response = await fetch('/api/ai/workout-of-the-week')
      if (response.ok) {
        const data = await response.json()
        if (data.success && data.workout) {
          setWorkoutOfWeek(data.workout)
          // Remember that user generated this week's workout
          const weekKey = `wow_generated_${getWeekStartDate()}`
          localStorage.setItem(weekKey, 'true')
        }
      } else if (response.status === 403) {
        const data = await response.json()
        console.error('WOW Error:', data.error)
      } else {
        console.error('Failed to load Workout of the Week')
      }
    } catch (error) {
      console.error('Error loading Workout of the Week:', error)
    } finally {
      setIsLoadingWOW(false)
    }
  }

  // Check if user already generated this week's workout on mount
  useEffect(() => {
    if (!user?.id) return

    const weekKey = `wow_generated_${getWeekStartDate()}`
    const wasGenerated = localStorage.getItem(weekKey)

    if (wasGenerated) {
      // Auto-load from API cache (won't consume quota if already exists)
      handleGenerateWOW()
    }
  }, [user?.id])

  // Load Stats only (WOW is now user-initiated)
  useEffect(() => {
    if (!user?.id) {
      setStats(null)
      setIsLoading(false)
      return
    }

    let isActive = true
    let activeController: AbortController | null = null

    const loadDashboardData = async () => {
      if (!isActive) {
        return
      }

      if (activeController) {
        activeController.abort()
      }

      const controller = new AbortController()
      activeController = controller

      if (!hasLoadedStatsRef.current) {
        setIsLoading(true)
      }

      try {
        // Fetch only stats (WOW is now loaded on-demand)
        const statsResponse = await fetch("/api/workouts/stats", { signal: controller.signal })

        // Process stats response
        if (statsResponse.ok) {
          const statsData = (await statsResponse.json()) as { stats: WorkoutStats }
          if (isActive) {
            hasLoadedStatsRef.current = true
            setStats(statsData.stats)
          }
        } else {
          throw new Error(`Failed to fetch stats: ${statsResponse.status}`)
        }

      } catch (error) {
        if (controller.signal.aborted) {
          return
        }

        if (isActive) {
          console.error("Error loading dashboard data:", error)
        }
      } finally {
        if (isActive && !controller.signal.aborted) {
          setIsLoading(false)
        }
      }
    }

    const handleStorage = (event: StorageEvent) => {
      if (event.key === "workouts" || event.key === "completedWorkouts") {
        void loadDashboardData()
      }
    }

    const handleFocus = () => {
      void loadDashboardData()
    }

    const handleWorkoutsUpdated = () => {
      void loadDashboardData()
    }

    void loadDashboardData()

    window.addEventListener("storage", handleStorage)
    window.addEventListener("focus", handleFocus)
    window.addEventListener("workoutsUpdated" as any, handleWorkoutsUpdated as EventListener)

    return () => {
      isActive = false
      activeController?.abort()
      hasLoadedStatsRef.current = false
      window.removeEventListener("storage", handleStorage)
      window.removeEventListener("focus", handleFocus)
      window.removeEventListener("workoutsUpdated" as any, handleWorkoutsUpdated as EventListener)
    }
  }, [user?.id])

  if (!isAuthenticated) {
    return <Login />
  }

  if (isLoading) {
    return (
      <>
        <Header />
        <main className="min-h-screen flex items-center justify-center">
          <LoadingSpinner text="Loading stats..." />
        </main>
      </>
    )
  }

  if (!stats) {
    return (
      <>
        <Header />
        <main className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <Dumbbell className="h-12 w-12 text-text-secondary mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-text-primary mb-2">No Data Yet</h2>
            <p className="text-text-secondary">Start adding workouts to see your progress!</p>
          </div>
        </main>
      </>
    )
  }

  return (
    <>
      <Header />
      <main className="min-h-screen pb-20 md:pb-8">
        <div className="max-w-7xl mx-auto px-4 py-8">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-text-primary mb-2">Dashboard</h1>
            <p className="text-text-secondary">Your fitness journey at a glance</p>
          </div>

          {/* Workout of the Week - Only show for paid users */}
          {user?.subscriptionTier && user.subscriptionTier !== 'free' && (
            <Card className="mb-8 border-primary/30 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-primary/20">
                      <Sparkles className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-xl">Workout of the Week</CardTitle>
                      <CardDescription>
                        Your free AI-generated weekly workout plan
                      </CardDescription>
                    </div>
                  </div>
                  {workoutOfWeek && (
                    <Button
                      onClick={() => router.push(`/workout/${workoutOfWeek.workoutId}`)}
                      size="sm"
                      className="gap-2"
                    >
                      <span className="hidden sm:inline">Start Workout</span>
                      <span className="sm:hidden">Start</span>
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </CardHeader>

              <CardContent>
                {/* State 1: Loading */}
                {isLoadingWOW && (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <p className="ml-3 text-text-secondary">Generating your personalized workout...</p>
                  </div>
                )}

                {/* State 2: Empty (before generation) */}
                {!workoutOfWeek && !isLoadingWOW && (
                  <div className="text-center py-8">
                    <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Sparkles className="h-8 w-8 text-primary" />
                    </div>
                    <h3 className="text-lg font-semibold text-text-primary mb-2">
                      Get Your AI Workout
                    </h3>
                    <p className="text-text-secondary mb-6 max-w-md mx-auto">
                      Personalized weekly workout based on your training profile and recent activity. Generated fresh every week!
                    </p>
                    <Button onClick={handleGenerateWOW} size="lg" className="gap-2">
                      <Sparkles className="h-4 w-4" />
                      <span>Generate This Week&apos;s Workout</span>
                    </Button>
                  </div>
                )}

                {/* State 3: Generated workout */}
                {workoutOfWeek && !isLoadingWOW && (
                  <div
                    onClick={() => router.push(`/workout/${workoutOfWeek.workoutId}`)}
                    className="cursor-pointer hover:bg-surface/50 rounded-lg p-4 transition-colors border border-border/50"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <h3 className="font-semibold text-lg text-text-primary mb-1">
                          {workoutOfWeek.title}
                        </h3>
                        {workoutOfWeek.description && (
                          <p className="text-sm text-text-secondary mb-2 line-clamp-2">
                            {workoutOfWeek.description}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-text-secondary flex-wrap">
                      <div className="flex items-center gap-1">
                        <Dumbbell className="h-4 w-4" />
                        <span>{workoutOfWeek.exercises?.length || 0} exercises</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        <span>{workoutOfWeek.totalDuration} min</span>
                      </div>
                      {workoutOfWeek.difficulty && (
                        <div className="flex items-center gap-1">
                          <Target className="h-4 w-4" />
                          <span className="capitalize">{workoutOfWeek.difficulty}</span>
                        </div>
                      )}
                    </div>
                    {workoutOfWeek.tags && workoutOfWeek.tags.length > 0 && (
                      <div className="flex gap-2 flex-wrap mt-3">
                        {workoutOfWeek.tags.slice(0, 4).map((tag: string, idx: number) => (
                          <span
                            key={idx}
                            className="px-2 py-1 bg-primary/10 text-primary text-xs rounded-md"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Key Metrics */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-text-secondary mb-1">Total Workouts</p>
                    <p className="text-2xl font-bold text-text-primary">
                      {stats.totalWorkouts}
                    </p>
                  </div>
                  <Dumbbell className="h-8 w-8 text-primary" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-text-secondary mb-1">Total Volume</p>
                    <p className="text-2xl font-bold text-text-primary">
                      {formatVolume(stats.totalVolume)}
                    </p>
                    <p className="text-xs text-text-secondary">lbs lifted</p>
                  </div>
                  <TrendingUp className="h-8 w-8 text-primary" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-text-secondary mb-1">Current Streak</p>
                    <p className="text-2xl font-bold text-text-primary">{stats.streakDays}</p>
                    <p className="text-xs text-text-secondary">days</p>
                  </div>
                  <Flame className="h-8 w-8 text-orange-500" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-text-secondary mb-1">Avg Duration</p>
                    <p className="text-2xl font-bold text-text-primary">
                      {stats.averageDuration}
                    </p>
                    <p className="text-xs text-text-secondary">minutes</p>
                  </div>
                  <Activity className="h-8 w-8 text-primary" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Charts */}
          <div className="grid lg:grid-cols-2 gap-6 mb-8">
            {/* Workouts by Month */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Calendar className="h-5 w-5 text-primary" />
                  <span>Workouts per Month</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={stats.workoutsByMonth}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                    <XAxis
                      dataKey="month"
                      stroke="rgba(255,255,255,0.5)"
                      tick={{ fill: "rgba(255,255,255,0.7)" }}
                    />
                    <YAxis stroke="rgba(255,255,255,0.5)" tick={{ fill: "rgba(255,255,255,0.7)" }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "rgba(30, 41, 59, 0.95)",
                        border: "1px solid rgba(255,255,255,0.1)",
                        borderRadius: "8px",
                      }}
                    />
                    <Bar dataKey="count" fill="#06b6d4" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Volume by Month */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <TrendingUp className="h-5 w-5 text-primary" />
                  <span>Volume Trend</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <LineChart data={stats.volumeByMonth}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                    <XAxis
                      dataKey="month"
                      stroke="rgba(255,255,255,0.5)"
                      tick={{ fill: "rgba(255,255,255,0.7)" }}
                    />
                    <YAxis stroke="rgba(255,255,255,0.5)" tick={{ fill: "rgba(255,255,255,0.7)" }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "rgba(30, 41, 59, 0.95)",
                        border: "1px solid rgba(255,255,255,0.1)",
                        borderRadius: "8px",
                      }}
                    />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="volume"
                      stroke="#06b6d4"
                      strokeWidth={2}
                      dot={{ fill: "#06b6d4", r: 4 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Recent Activity & Favorite Exercises */}
          <div className="grid lg:grid-cols-2 gap-6 mb-8">
            {/* Recent Activity */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Activity className="h-5 w-5 text-primary" />
                  <span>Recent Activity</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {stats.recentWorkouts.length > 0 ? (
                  <div className="space-y-3">
                    {stats.recentWorkouts.map((workout, idx) => (
                      <div key={workout.workoutId || idx} className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                            <Dumbbell className="h-4 w-4 text-primary" />
                          </div>
                          <div>
                            <p className="text-text-primary font-medium">{workout.title}</p>
                            <p className="text-xs text-text-secondary">
                              {workout.exercises.length} exercises • {workout.source === 'instagram' ? 'Instagram' : 'Manual'}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-text-secondary">
                            {new Date(workout.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-text-secondary text-center py-4">No recent workouts</p>
                )}
              </CardContent>
            </Card>

            {/* Favorite Exercises */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Target className="h-5 w-5 text-primary" />
                  <span>Top Exercises</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {stats.favoriteExercises.length > 0 ? (
                  <div className="space-y-3">
                    {stats.favoriteExercises.map((exercise, idx) => (
                      <div key={idx} className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold">
                            {idx + 1}
                          </div>
                          <span className="text-text-primary font-medium">{exercise.name}</span>
                        </div>
                        <span className="text-sm text-text-secondary">{exercise.count} times</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-text-secondary text-center py-4">No exercises yet</p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Personal Records */}
          <div className="grid lg:grid-cols-1 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Trophy className="h-5 w-5 text-yellow-500" />
                  <span>Personal Records</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {stats.personalRecords.length > 0 ? (
                  <div className="space-y-3">
                    {stats.personalRecords.slice(0, 5).map((pr, idx) => (
                      <div key={idx} className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <Award className="h-5 w-5 text-yellow-500" />
                          <div>
                            <p className="text-text-primary font-medium">{pr.exercise}</p>
                            <p className="text-xs text-text-secondary">
                              {new Date(pr.date).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-text-primary font-semibold">{pr.weight}</p>
                          <p className="text-xs text-text-secondary">{pr.reps} reps</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-text-secondary text-center py-4">No PRs yet</p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
      <MobileNav />
    </>
  )
}
