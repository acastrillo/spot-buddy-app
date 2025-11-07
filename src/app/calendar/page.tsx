"use client"

import { useEffect, useMemo, useState } from "react"
import { useAuthStore } from "@/store"
import { Login } from "@/components/auth/login"
import { Header } from "@/components/layout/header"
import { MobileNav } from "@/components/layout/mobile-nav"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Input } from "@/components/ui/input"
import {
  Plus,
  Dumbbell,
  Clock,
  TrendingUp,
  CalendarDays,
  ChevronRight,
  X,
  CheckCircle
} from "lucide-react"

// Type definition for workout from DynamoDB
interface DynamoDBWorkout {
  workoutId: string
  userId: string
  title: string
  description?: string
  exercises: any[]
  content: string
  author?: any
  createdAt: string
  updatedAt?: string
  source: string
  type: string
  totalDuration: number
  difficulty: string
  tags: string[]
  status?: 'scheduled' | 'completed'
  scheduledDate?: string
  completedDate?: string
}
import Link from "next/link"
import { useRouter } from "next/navigation"

export default function CalendarPage() {
  const { isAuthenticated, user } = useAuthStore()
  const router = useRouter()
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date())
  const [workouts, setWorkouts] = useState<DynamoDBWorkout[]>([])
  const [scheduledWorkouts, setScheduledWorkouts] = useState<DynamoDBWorkout[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showScheduleModal, setShowScheduleModal] = useState(false)
  const [selectedWorkoutForSchedule, setSelectedWorkoutForSchedule] = useState<string | null>(null)
  const [scheduleDate, setScheduleDate] = useState(new Date().toISOString().split('T')[0])
  const [showAllActivity, setShowAllActivity] = useState(false)

  // Load workouts from API
  useEffect(() => {
    async function loadWorkouts() {
      if (!user?.id) return

      setIsLoading(true)
      try {
        // Fetch all workouts
        const workoutsResponse = await fetch('/api/workouts')
        if (!workoutsResponse.ok) throw new Error('Failed to fetch workouts')
        const { workouts: data } = await workoutsResponse.json()
        setWorkouts(data)

        // Fetch scheduled workouts
        const scheduledResponse = await fetch('/api/workouts/scheduled')
        if (!scheduledResponse.ok) throw new Error('Failed to fetch scheduled workouts')
        const scheduled = await scheduledResponse.json()
        setScheduledWorkouts(scheduled)
      } catch (error) {
        console.error("Error loading workouts:", error)
        // Fallback to localStorage
        const cached = JSON.parse(localStorage.getItem('workouts') || '[]')
        setWorkouts(cached)
      } finally {
        setIsLoading(false)
      }
    }

    loadWorkouts()
  }, [user?.id])

  // Calculate workout dates for calendar marking (completed workouts)
  const markedDates = useMemo(() => {
    return Array.from(
      new Set(
        workouts
          .filter(w => w.status === 'completed' || !w.status) // Include workouts without status (legacy)
          .map((w) => {
            // Use completedDate if available, otherwise createdAt
            const date = w.completedDate || w.createdAt;
            return new Date(date).toISOString().split("T")[0];
          })
      )
    )
  }, [workouts])

  const dateCounts = useMemo(() => {
    const map: Record<string, number> = {}
    for (const w of workouts) {
      if (w.status === 'completed' || !w.status) {
        const d = (w.completedDate || w.createdAt);
        const dateStr = new Date(d).toISOString().split("T")[0];
        map[dateStr] = (map[dateStr] || 0) + 1;
      }
    }
    return map
  }, [workouts])

  // Calculate scheduled workout dates for calendar marking
  const scheduledDates = useMemo(() => {
    return Array.from(
      new Set(
        scheduledWorkouts
          .filter(w => w.scheduledDate && w.status === 'scheduled')
          .map((w) => w.scheduledDate!)
      )
    )
  }, [scheduledWorkouts])

  const scheduledCounts = useMemo(() => {
    const map: Record<string, number> = {}
    for (const w of scheduledWorkouts) {
      if (w.scheduledDate && w.status === 'scheduled') {
        map[w.scheduledDate] = (map[w.scheduledDate] || 0) + 1
      }
    }
    return map
  }, [scheduledWorkouts])

  // Get workouts for selected date (both completed and scheduled)
  const selectedDateWorkouts = useMemo(() => {
    if (!selectedDate) return []
    const dateStr = selectedDate.toISOString().split("T")[0]

    // Get completed workouts for this date
    const completed = workouts.filter((w) => {
      const completedDateStr = w.completedDate
        ? w.completedDate
        : new Date(w.createdAt).toISOString().split("T")[0];
      return completedDateStr === dateStr && (w.status === 'completed' || !w.status);
    })

    // Get scheduled workouts for this date
    const scheduled = scheduledWorkouts.filter(
      (w) => w.scheduledDate === dateStr && w.status === 'scheduled'
    )

    return [...completed, ...scheduled]
  }, [selectedDate, workouts, scheduledWorkouts])

  // Calculate stats for selected month
  const stats = useMemo(() => {
    if (!selectedDate) return { monthWorkouts: 0, hours: 0, streak: 0 }
    const month = selectedDate.getMonth()
    const year = selectedDate.getFullYear()

    const inMonth = workouts.filter((w) => {
      const d = new Date(w.createdAt)
      return d.getMonth() === month && d.getFullYear() === year
    })

    // Calculate total hours
    const totalMinutes = inMonth.reduce((sum, w) => sum + (w.totalDuration || 0), 0)
    const hours = Math.round((totalMinutes / 60) * 10) / 10

    // Calculate streak (consecutive days)
    const allDates = Array.from(
      new Set(workouts.map((w) => new Date(w.createdAt).toISOString().split("T")[0]))
    ).sort((a, b) => new Date(b).getTime() - new Date(a).getTime())

    let streak = 0
    const todayIso = new Date().toISOString().split("T")[0]
    const yesterdayIso = new Date(Date.now() - 86400000).toISOString().split("T")[0]

    if (allDates.length > 0 && (allDates[0] === todayIso || allDates[0] === yesterdayIso)) {
      let cursor = allDates[0]
      for (const dateStr of allDates) {
        if (dateStr === cursor) {
          streak++
          const prev = new Date(cursor)
          prev.setDate(prev.getDate() - 1)
          cursor = prev.toISOString().split("T")[0]
        } else {
          break
        }
      }
    }

    return { monthWorkouts: inMonth.length, hours, streak }
  }, [workouts, selectedDate])

  // Get workouts from last 24 hours
  const last24hWorkouts = useMemo(() => {
    const now = new Date()
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000)

    return workouts
      .filter(w => {
        const created = new Date(w.createdAt)
        return created >= yesterday && created <= now
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  }, [workouts])

  // Get last 3 completed workouts for recent activity
  const recentCompletedWorkouts = useMemo(() => {
    return workouts
      .filter(w => w.status === 'completed' || !w.status)
      .sort((a, b) => {
        const dateA = new Date(a.completedDate || a.createdAt)
        const dateB = new Date(b.completedDate || b.createdAt)
        return dateB.getTime() - dateA.getTime()
      })
      .slice(0, showAllActivity ? undefined : 3)
  }, [workouts, showAllActivity])

  // Handle scheduling a workout
  const handleScheduleWorkout = async () => {
    if (!selectedWorkoutForSchedule) return

    try {
      const response = await fetch(`/api/workouts/${selectedWorkoutForSchedule}/schedule`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scheduledDate: scheduleDate,
          status: 'scheduled',
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to schedule workout')
      }

      // Reload workouts
      if (user?.id) {
        const workoutsResponse = await fetch('/api/workouts')
        if (workoutsResponse.ok) {
          const { workouts: data } = await workoutsResponse.json()
          setWorkouts(data)
        }

        const scheduledResponse = await fetch('/api/workouts/scheduled')
        if (scheduledResponse.ok) {
          const scheduled = await scheduledResponse.json()
          setScheduledWorkouts(scheduled)
        }
      }

      // Close modal
      setShowScheduleModal(false)
      setSelectedWorkoutForSchedule(null)
    } catch (error) {
      console.error('Error scheduling workout:', error)
      alert('Failed to schedule workout. Please try again.')
    }
  }

  if (!isAuthenticated) {
    return <Login />
  }

  const thisMonthStats = [
    { icon: Dumbbell, label: "Workouts", value: String(stats.monthWorkouts), color: "text-primary" },
    { icon: Clock, label: "Hours", value: `${stats.hours}h`, color: "text-rest" },
    { icon: TrendingUp, label: "Streak", value: `${stats.streak} days`, color: "text-success" },
  ]

  return (
    <>
      <Header />
      <main className="min-h-screen pb-20 md:pb-8 flex justify-center">
        <div className="w-full max-w-7xl mx-auto px-4 py-8">
          {/* Header Section */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold text-text-primary mb-2">
                Workout Calendar
              </h1>
              <p className="text-text-secondary">
                Track your fitness journey
              </p>
            </div>
            <Button
              className="flex items-center space-x-2"
              onClick={() => setShowScheduleModal(true)}
            >
              <Plus className="h-4 w-4" />
              <span>Schedule Workout</span>
            </Button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Calendar */}
            <div className="lg:col-span-2">
              <Card className="h-fit">
                <Calendar
                  selected={selectedDate}
                  onSelect={setSelectedDate}
                  markedDates={markedDates}
                  dateCounts={dateCounts}
                  scheduledDates={scheduledDates}
                  scheduledCounts={scheduledCounts}
                />
              </Card>

              {/* Selected Date Workouts */}
              {selectedDateWorkouts.length > 0 && (
                <Card className="mt-6">
                  <CardHeader className="pb-4">
                    <CardTitle className="text-lg">
                      Workouts on {selectedDate?.toLocaleDateString()}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {selectedDateWorkouts.map((workout) => (
                      <div
                        key={workout.workoutId}
                        onClick={() => router.push(`/workout/${workout.workoutId}`)}
                        className="p-3 bg-surface hover:bg-surface-elevated rounded-lg cursor-pointer transition-colors flex items-center justify-between"
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-medium text-text-primary">
                              {workout.title}
                            </h4>
                            {workout.status === 'scheduled' && (
                              <span className="px-2 py-0.5 text-xs rounded-full bg-secondary/20 text-secondary border border-secondary/30">
                                Scheduled
                              </span>
                            )}
                            {workout.status === 'completed' && (
                              <span className="px-2 py-0.5 text-xs rounded-full bg-primary/20 text-primary border border-primary/30">
                                Completed
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-text-secondary">
                            {workout.exercises.length} exercises • {workout.totalDuration} min
                          </p>
                        </div>
                        <ChevronRight className="h-5 w-5 text-text-secondary" />
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Right Sidebar */}
            <div className="space-y-6">
              {/* This Month Stats */}
              <Card>
                <CardHeader className="pb-4">
                  <CardTitle className="text-lg">This Month</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {thisMonthStats.map((stat, index) => {
                    const Icon = stat.icon
                    return (
                      <div key={index} className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <Icon className={`h-4 w-4 ${stat.color}`} />
                          <span className="text-text-secondary text-sm">{stat.label}</span>
                        </div>
                        <span className="font-semibold text-text-primary">{stat.value}</span>
                      </div>
                    )
                  })}
                </CardContent>
              </Card>

              {/* Last 24 Hours */}
              {last24hWorkouts.length > 0 && (
                <Card>
                  <CardHeader className="pb-4">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Clock className="h-5 w-5 text-primary" />
                      Last 24 Hours
                    </CardTitle>
                    <p className="text-text-secondary text-sm">Recent workouts saved</p>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {last24hWorkouts.map((workout) => (
                        <div
                          key={workout.workoutId}
                          onClick={() => {
                            setSelectedWorkoutForSchedule(workout.workoutId)
                            setShowScheduleModal(true)
                          }}
                          className="flex items-center justify-between text-sm cursor-pointer hover:bg-surface-elevated rounded-lg p-3 transition-colors border border-border/50"
                        >
                          <div className="flex-1">
                            <div className="text-text-primary font-medium line-clamp-1 mb-1">
                              {workout.title}
                            </div>
                            <div className="text-text-secondary text-xs">
                              {workout.exercises.length} exercises • {workout.totalDuration} min
                            </div>
                          </div>
                          <CalendarDays className="h-4 w-4 text-primary" />
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Recent Activity */}
              <Card>
                <CardHeader className="pb-4">
                  <CardTitle className="text-lg">Recent Activity</CardTitle>
                  <p className="text-text-secondary text-sm">Last 3 completed workouts</p>
                </CardHeader>
                <CardContent>
                  {recentCompletedWorkouts.length === 0 ? (
                    <div className="text-center py-8">
                      <div className="w-12 h-12 bg-surface rounded-full flex items-center justify-center mx-auto mb-3">
                        <Dumbbell className="h-6 w-6 text-text-secondary" />
                      </div>
                      <p className="text-text-primary font-medium mb-2">No completed workouts yet</p>
                      <Link href="/add">
                        <Button variant="outline" size="sm">
                          Add Your First
                        </Button>
                      </Link>
                    </div>
                  ) : (
                    <>
                      <div className="space-y-3">
                        {recentCompletedWorkouts.map((workout) => (
                          <div
                            key={workout.workoutId}
                            onClick={() => router.push(`/workout/${workout.workoutId}`)}
                            className="flex items-center justify-between text-sm cursor-pointer hover:bg-surface rounded-lg p-2 -mx-2 transition-colors"
                          >
                            <div className="flex-1">
                              <div className="text-text-primary line-clamp-1">{workout.title}</div>
                              <div className="flex items-center gap-2 mt-1">
                                <CheckCircle className="h-3 w-3 text-primary" />
                                <span className="text-text-secondary text-xs">
                                  {new Date(workout.completedDate || workout.createdAt).toLocaleDateString()}
                                </span>
                              </div>
                            </div>
                            <ChevronRight className="h-4 w-4 text-text-secondary" />
                          </div>
                        ))}
                      </div>
                      {!showAllActivity && workouts.filter(w => w.status === 'completed' || !w.status).length > 3 && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full mt-4"
                          onClick={() => setShowAllActivity(true)}
                        >
                          Show More
                        </Button>
                      )}
                      {showAllActivity && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full mt-4"
                          onClick={() => setShowAllActivity(false)}
                        >
                          Show Less
                        </Button>
                      )}
                    </>
                  )}
                </CardContent>
              </Card>

              {/* Weekly Goal */}
              <Card className="border-border/50">
                <CardContent className="p-6">
                  <div className="mb-4">
                    <h3 className="font-semibold text-text-primary mb-1">Weekly Goal</h3>
                    <p className="text-sm text-text-secondary">Stay consistent with your training</p>
                  </div>
                  
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-text-secondary">Progress</span>
                      <span className="font-medium text-text-primary">0/3 workouts</span>
                    </div>
                    
                    {/* Progress Bar */}
                    <div className="w-full bg-surface rounded-full h-2">
                      <div className="bg-primary h-2 rounded-full w-0 transition-all duration-300"></div>
                    </div>
                    
                    <p className="text-xs text-text-secondary">
                      Keep going! You're on track to reach your weekly goal.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Schedule Workout Modal */}
          {showScheduleModal && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
              <Card className="w-full max-w-3xl max-h-[90vh] overflow-y-auto">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-2xl">Schedule Workout</CardTitle>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        setShowScheduleModal(false)
                        setSelectedWorkoutForSchedule(null)
                      }}
                    >
                      <X className="h-5 w-5" />
                    </Button>
                  </div>
                  <p className="text-text-secondary">
                    {selectedWorkoutForSchedule
                      ? 'Select a date to schedule this workout'
                      : 'Select a workout to schedule'}
                  </p>
                </CardHeader>
                <CardContent>
                  {selectedWorkoutForSchedule ? (
                    // Date picker view
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-text-primary mb-2">
                          Select Date
                        </label>
                        <Input
                          type="date"
                          value={scheduleDate}
                          onChange={(e) => setScheduleDate(e.target.value)}
                          className="w-full"
                          min={new Date().toISOString().split('T')[0]}
                        />
                      </div>
                      <div className="flex gap-3">
                        <Button
                          className="flex-1"
                          onClick={handleScheduleWorkout}
                        >
                          Confirm Schedule
                        </Button>
                        <Button
                          variant="outline"
                          className="flex-1"
                          onClick={() => setSelectedWorkoutForSchedule(null)}
                        >
                          Back
                        </Button>
                      </div>
                    </div>
                  ) : (
                    // Workout selection view
                    <div className="space-y-3">
                      {workouts.length === 0 ? (
                        <div className="text-center py-12">
                          <Dumbbell className="h-12 w-12 text-text-secondary mx-auto mb-4" />
                          <p className="text-text-primary font-medium mb-2">No workouts yet</p>
                          <p className="text-text-secondary text-sm mb-4">
                            Create a workout first before scheduling
                          </p>
                          <Link href="/add">
                            <Button>
                              <Plus className="h-4 w-4 mr-2" />
                              Add Workout
                            </Button>
                          </Link>
                        </div>
                      ) : (
                        workouts.map((workout) => (
                          <div
                            key={workout.workoutId}
                            onClick={() => setSelectedWorkoutForSchedule(workout.workoutId)}
                            className="p-4 border border-border rounded-lg cursor-pointer hover:bg-surface-elevated transition-colors"
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <h4 className="font-semibold text-text-primary mb-1">
                                  {workout.title}
                                </h4>
                                <p className="text-sm text-text-secondary mb-2">
                                  {workout.exercises.length} exercises • {workout.totalDuration} min
                                </p>
                                {workout.tags && workout.tags.length > 0 && (
                                  <div className="flex gap-2 flex-wrap">
                                    {workout.tags.slice(0, 3).map((tag, idx) => (
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
                              <ChevronRight className="h-5 w-5 text-text-secondary flex-shrink-0" />
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </main>
      <MobileNav />
    </>
  )
}
