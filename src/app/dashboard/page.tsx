"use client"

import { useState, useEffect } from "react"
import { useAuthStore } from "@/store"
import { Login } from "@/components/auth/login"
import { Header } from "@/components/layout/header"
import { MobileNav } from "@/components/layout/mobile-nav"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { dynamoDBWorkouts } from "@/lib/dynamodb"
import { calculateWorkoutStats, WorkoutStats } from "@/lib/workout-stats"
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
} from "lucide-react"
import { LoadingSpinner } from "@/components/ui/loading-spinner"

export default function DashboardPage() {
  const { isAuthenticated, user } = useAuthStore()
  const [stats, setStats] = useState<WorkoutStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function loadStats() {
      if (!user?.id) return

      setIsLoading(true)
      try {
        const workouts = await dynamoDBWorkouts.list(user.id)
        const calculatedStats = calculateWorkoutStats(workouts)
        setStats(calculatedStats)
      } catch (error) {
        console.error("Error loading workout stats:", error)
      } finally {
        setIsLoading(false)
      }
    }

    loadStats()
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
                      {(stats.totalVolume / 1000).toFixed(1)}k
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

          {/* Favorite Exercises & PRs */}
          <div className="grid lg:grid-cols-2 gap-6">
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

            {/* Personal Records */}
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
