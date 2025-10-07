"use client"

import { useEffect, useMemo, useState } from "react"
import { useAuthStore } from "@/store"
import { Login } from "@/components/auth/login"
import { Header } from "@/components/layout/header"
import { MobileNav } from "@/components/layout/mobile-nav"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { dynamoDBWorkouts, DynamoDBWorkout } from "@/lib/dynamodb"
import {
  Plus,
  Dumbbell,
  Clock,
  TrendingUp,
  CalendarDays,
  ChevronRight
} from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"

export default function CalendarPage() {
  const { isAuthenticated, user } = useAuthStore()
  const router = useRouter()
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date())
  const [workouts, setWorkouts] = useState<DynamoDBWorkout[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // Load workouts from DynamoDB
  useEffect(() => {
    async function loadWorkouts() {
      if (!user?.id) return

      setIsLoading(true)
      try {
        const data = await dynamoDBWorkouts.list(user.id)
        setWorkouts(data)
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

  // Calculate workout dates for calendar marking
  const markedDates = useMemo(() => {
    return Array.from(
      new Set(
        workouts.map((w) => new Date(w.createdAt).toISOString().split("T")[0])
      )
    )
  }, [workouts])

  const dateCounts = useMemo(() => {
    const map: Record<string, number> = {}
    for (const w of workouts) {
      const d = new Date(w.createdAt).toISOString().split("T")[0]
      map[d] = (map[d] || 0) + 1
    }
    return map
  }, [workouts])

  // Get workouts for selected date
  const selectedDateWorkouts = useMemo(() => {
    if (!selectedDate) return []
    const dateStr = selectedDate.toISOString().split("T")[0]
    return workouts.filter(
      (w) => new Date(w.createdAt).toISOString().split("T")[0] === dateStr
    )
  }, [selectedDate, workouts])

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
            <Link href="/library">
              <Button className="flex items-center space-x-2">
                <Plus className="h-4 w-4" />
                <span>Schedule Workout</span>
              </Button>
            </Link>
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
                  scheduledDates={[]}
                  scheduledCounts={{}}
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
                          <h4 className="font-medium text-text-primary mb-1">
                            {workout.title}
                          </h4>
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

              {/* Recent Workouts */}
              <Card>
                <CardHeader className="pb-4">
                  <CardTitle className="text-lg">Recent Activity</CardTitle>
                  <p className="text-text-secondary text-sm">Your latest workouts</p>
                </CardHeader>
                <CardContent>
                  {workouts.length === 0 ? (
                    <div className="text-center py-8">
                      <div className="w-12 h-12 bg-surface rounded-full flex items-center justify-center mx-auto mb-3">
                        <Dumbbell className="h-6 w-6 text-text-secondary" />
                      </div>
                      <p className="text-text-primary font-medium mb-2">No workouts yet</p>
                      <Link href="/add">
                        <Button variant="outline" size="sm">
                          Add Your First
                        </Button>
                      </Link>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {workouts
                        .slice(0, 5)
                        .map((workout) => (
                          <div
                            key={workout.workoutId}
                            onClick={() => router.push(`/workout/${workout.workoutId}`)}
                            className="flex items-center justify-between text-sm cursor-pointer hover:bg-surface rounded-lg p-2 -mx-2 transition-colors"
                          >
                            <div className="text-text-primary line-clamp-1">{workout.title}</div>
                            <div className="text-text-secondary text-xs">
                              {new Date(workout.createdAt).toLocaleDateString()}
                            </div>
                          </div>
                        ))}
                    </div>
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
        </div>
      </main>
      <MobileNav />
    </>
  )
}
