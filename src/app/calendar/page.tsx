"use client"

import { useEffect, useMemo, useState } from "react"
import { useAuthStore } from "@/store"
import { Login } from "@/components/auth/login"
import { Header } from "@/components/layout/header"
import { MobileNav } from "@/components/layout/mobile-nav"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { 
  Plus, 
  Dumbbell, 
  Clock, 
  TrendingUp, 
  CalendarDays,
  Target
} from "lucide-react"
import Link from "next/link"

export default function CalendarPage() {
  const { isAuthenticated } = useAuthStore()
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date())
  const [completions, setCompletions] = useState<any[]>([])
  const [scheduled, setScheduled] = useState<any[]>([])

  // Load completions and react to changes
  useEffect(() => {
    const load = () => {
      const existing = JSON.parse(localStorage.getItem('completedWorkouts') || '[]')
      setCompletions(existing)
      const sched = JSON.parse(localStorage.getItem('scheduledWorkouts') || '[]')
      setScheduled(sched)
    }
    load()
    const handle = () => load()
    window.addEventListener('storage', handle)
    window.addEventListener('completedWorkoutsUpdated', handle as any)
    window.addEventListener('scheduledWorkoutsUpdated', handle as any)
    return () => {
      window.removeEventListener('storage', handle)
      window.removeEventListener('completedWorkoutsUpdated', handle as any)
      window.removeEventListener('scheduledWorkoutsUpdated', handle as any)
    }
  }, [])

  const markedDates = useMemo(() => {
    return Array.from(new Set(completions.map((c: any) => c.completedDate)))
  }, [completions])

  const dateCounts = useMemo(() => {
    const map: Record<string, number> = {}
    for (const c of completions) {
      const d = c.completedDate
      map[d] = (map[d] || 0) + 1
    }
    return map
  }, [completions])

  const scheduledDates = useMemo(() => {
    return Array.from(new Set(scheduled.map((s: any) => s.scheduledDate)))
  }, [scheduled])

  const scheduledCounts = useMemo(() => {
    const map: Record<string, number> = {}
    for (const s of scheduled) {
      const d = s.scheduledDate
      map[d] = (map[d] || 0) + 1
    }
    return map
  }, [scheduled])

  const stats = useMemo(() => {
    if (!selectedDate) return { monthWorkouts: 0, hours: 0, streak: 0 }
    const month = selectedDate.getMonth()
    const year = selectedDate.getFullYear()

    const inMonth = completions.filter((c: any) => {
      const d = new Date(c.completedDate)
      return d.getMonth() === month && d.getFullYear() === year
    })

    // Streak: consecutive days up to today
    const allDates = Array.from(new Set(completions.map((c: any) => c.completedDate)))
      .sort((a, b) => new Date(b as string).getTime() - new Date(a as string).getTime())

    let streak = 0
    const todayIso = new Date().toISOString().split('T')[0]
    let cursor = todayIso
    for (const ds of allDates) {
      if (ds === cursor) {
        streak++
        const prev = new Date(cursor)
        prev.setDate(prev.getDate() - 1)
        cursor = prev.toISOString().split('T')[0]
      } else if (new Date(ds) < new Date(cursor)) {
        break
      }
    }

    const hours = Math.round((inMonth.length * 0.75) * 10) / 10
    return { monthWorkouts: inMonth.length, hours, streak }
  }, [completions, selectedDate])

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
                  scheduledDates={scheduledDates}
                  scheduledCounts={scheduledCounts}
                />
              </Card>
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

              {/* Upcoming Workouts */}
              <Card>
                <CardHeader className="pb-4">
                  <CardTitle className="text-lg">Upcoming</CardTitle>
                  <p className="text-text-secondary text-sm">Your scheduled workouts</p>
                </CardHeader>
                <CardContent>
                  {scheduled.length === 0 ? (
                    <div className="text-center py-8">
                      <div className="w-12 h-12 bg-surface rounded-full flex items-center justify-center mx-auto mb-3">
                        <CalendarDays className="h-6 w-6 text-text-secondary" />
                      </div>
                      <p className="text-text-primary font-medium mb-2">No workouts scheduled</p>
                      <Link href="/library">
                        <Button variant="outline" size="sm">
                          Schedule One
                        </Button>
                      </Link>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {scheduled
                        .slice()
                        .sort((a: any, b: any) => new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime())
                        .slice(0, 5)
                        .map((item: any, idx: number) => {
                          const workouts = JSON.parse(localStorage.getItem('workouts') || '[]')
                          const w = workouts.find((x: any) => x.id === item.workoutId)
                          return (
                            <div key={idx} className="flex items-center justify-between text-sm">
                              <div className="text-text-primary line-clamp-1">{w?.title || 'Workout'}</div>
                              <div className="text-text-secondary">{new Date(item.scheduledDate).toLocaleDateString()}</div>
                            </div>
                          )
                        })}
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
