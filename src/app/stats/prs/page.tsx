"use client"

import { useState, useEffect } from "react"
import { useAuthStore } from "@/store"
import { Login } from "@/components/auth/login"
import { Header } from "@/components/layout/header"
import { MobileNav } from "@/components/layout/mobile-nav"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Award,
  TrendingUp,
  Dumbbell,
  Trophy,
  Calendar
} from "lucide-react"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { calculate1RM, extractPRsFromWorkout, getCurrentPR, getPRHistory, PersonalRecord } from "@/lib/pr-calculator"

export default function PersonalRecordsPage() {
  const { isAuthenticated, user } = useAuthStore()
  const [workouts, setWorkouts] = useState<any[]>([])
  const [prs, setPRs] = useState<PersonalRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedExercise, setSelectedExercise] = useState<string | null>(null)

  useEffect(() => {
    if (user?.id) {
      loadWorkoutsAndPRs()
    }
  }, [user?.id])

  const loadWorkoutsAndPRs = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/workouts')
      if (response.ok) {
        const { workouts: data } = await response.json()
        setWorkouts(data)

        // Extract all PRs from workouts
        const allPRs: PersonalRecord[] = []
        for (const workout of data) {
          const workoutPRs = extractPRsFromWorkout(workout, allPRs)
          allPRs.push(...workoutPRs)
        }

        setPRs(allPRs)
      }
    } catch (error) {
      console.error('Error loading workouts:', error)
    } finally {
      setLoading(false)
    }
  }

  if (!isAuthenticated) {
    return <Login />
  }

  // Get unique exercises with PRs
  const exercisesWithPRs = Array.from(
    new Set(prs.map(pr => pr.exerciseName))
  ).sort()

  // Get top PRs by exercise (highest 1RM)
  const topPRsByExercise = exercisesWithPRs
    .map(exercise => getCurrentPR(exercise, prs))
    .filter((pr): pr is PersonalRecord => pr !== null)
    .sort((a, b) => b.oneRepMax - a.oneRepMax)

  // Get recent PRs (last 30 days)
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
  const recentPRs = prs
    .filter(pr => new Date(pr.date) >= thirtyDaysAgo)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

  // Calculate stats
  const totalPRs = prs.length
  const exerciseCount = exercisesWithPRs.length
  const recentPRCount = recentPRs.length

  // Selected exercise history chart data
  const selectedExerciseHistory = selectedExercise
    ? getPRHistory(selectedExercise, prs).map(pr => ({
        date: new Date(pr.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        oneRepMax: Math.round(pr.oneRepMax),
        weight: pr.weight,
        reps: pr.reps,
      }))
    : []

  return (
    <>
      <Header />
      <main className="min-h-screen pb-20 md:pb-8 flex justify-center">
        <div className="w-full max-w-6xl mx-auto px-4 py-8">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-text-primary mb-2">
              Personal Records
            </h1>
            <p className="text-text-secondary">
              Track your strength gains and 1RM progression
            </p>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-text-secondary mb-1">Total PRs</p>
                    <p className="text-2xl font-bold text-text-primary">{totalPRs}</p>
                  </div>
                  <Trophy className="h-8 w-8 text-primary" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-text-secondary mb-1">Exercises Tracked</p>
                    <p className="text-2xl font-bold text-text-primary">{exerciseCount}</p>
                  </div>
                  <Dumbbell className="h-8 w-8 text-secondary" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-text-secondary mb-1">PRs (30 days)</p>
                    <p className="text-2xl font-bold text-text-primary">{recentPRCount}</p>
                  </div>
                  <TrendingUp className="h-8 w-8 text-success" />
                </div>
              </CardContent>
            </Card>
          </div>

          {loading ? (
            <div className="text-center py-12 text-text-secondary">Loading PRs...</div>
          ) : prs.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <Award className="h-16 w-16 text-text-secondary mx-auto mb-4" />
                <h3 className="text-lg font-medium text-text-primary mb-2">No PRs yet</h3>
                <p className="text-text-secondary mb-6">
                  Start tracking your workouts to automatically detect personal records!
                </p>
                <Button onClick={() => window.location.href = '/add'}>
                  Add Workout
                </Button>
              </CardContent>
            </Card>
          ) : (
            <Tabs defaultValue="all" className="mb-8">
              <TabsList>
                <TabsTrigger value="all">All PRs</TabsTrigger>
                <TabsTrigger value="recent">Recent</TabsTrigger>
                <TabsTrigger value="progression">Progression</TabsTrigger>
              </TabsList>

              {/* All PRs Tab */}
              <TabsContent value="all">
                <Card>
                  <CardHeader>
                    <CardTitle>Current Personal Records</CardTitle>
                    <CardDescription>Your best lifts by exercise</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {topPRsByExercise.map((pr) => {
                        const estimated1RM = calculate1RM(pr.weight, pr.reps)
                        return (
                          <div
                            key={pr.exerciseName}
                            className="border border-border rounded-lg p-4 hover:border-primary/50 transition-colors cursor-pointer"
                            onClick={() => setSelectedExercise(pr.exerciseName)}
                          >
                            <div className="flex justify-between items-start mb-2">
                              <h4 className="font-medium text-text-primary text-lg">
                                {pr.exerciseName}
                              </h4>
                              <span className="text-xs text-text-secondary">
                                {new Date(pr.date).toLocaleDateString()}
                              </span>
                            </div>
                            <div className="grid grid-cols-3 gap-4">
                              <div>
                                <p className="text-xs text-text-secondary">Weight × Reps</p>
                                <p className="text-sm font-medium text-text-primary">
                                  {pr.weight} {pr.unit} × {pr.reps}
                                </p>
                              </div>
                              <div>
                                <p className="text-xs text-text-secondary">Estimated 1RM</p>
                                <p className="text-sm font-medium text-primary">
                                  {Math.round(estimated1RM.value)} {pr.unit}
                                </p>
                              </div>
                              <div>
                                <p className="text-xs text-text-secondary">Formula</p>
                                <p className="text-sm font-medium text-text-secondary">
                                  {estimated1RM.formula}
                                </p>
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Recent PRs Tab */}
              <TabsContent value="recent">
                <Card>
                  <CardHeader>
                    <CardTitle>Recent PRs (Last 30 Days)</CardTitle>
                    <CardDescription>Your latest achievements</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {recentPRs.length === 0 ? (
                      <div className="text-center py-12 text-text-secondary">
                        No PRs in the last 30 days. Keep pushing!
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {recentPRs.map((pr, index) => (
                          <div key={index} className="border border-border rounded-lg p-4">
                            <div className="flex items-center justify-between mb-2">
                              <h4 className="font-medium text-text-primary">
                                {pr.exerciseName}
                              </h4>
                              <div className="flex items-center space-x-2">
                                <Trophy className="h-4 w-4 text-primary" />
                                <span className="text-xs text-text-secondary">
                                  {new Date(pr.date).toLocaleDateString()}
                                </span>
                              </div>
                            </div>
                            <div className="flex items-center space-x-4 text-sm">
                              <span className="text-text-secondary">
                                {pr.weight} {pr.unit} × {pr.reps}
                              </span>
                              <span className="text-primary font-medium">
                                1RM: {Math.round(pr.oneRepMax)} {pr.unit}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Progression Tab */}
              <TabsContent value="progression">
                <div className="space-y-4">
                  {/* Exercise Selector */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Select Exercise</CardTitle>
                      <CardDescription>View strength progression over time</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                        {exercisesWithPRs.map((exercise) => (
                          <Button
                            key={exercise}
                            variant={selectedExercise === exercise ? "default" : "outline"}
                            onClick={() => setSelectedExercise(exercise)}
                            className="justify-start"
                          >
                            {exercise}
                          </Button>
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Progression Chart */}
                  {selectedExercise && (
                    <Card>
                      <CardHeader>
                        <CardTitle>{selectedExercise} Progression</CardTitle>
                        <CardDescription>1RM estimates over time</CardDescription>
                      </CardHeader>
                      <CardContent>
                        {selectedExerciseHistory.length > 0 ? (
                          <>
                            <ResponsiveContainer width="100%" height={300}>
                              <LineChart data={selectedExerciseHistory}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" />
                                <XAxis dataKey="date" stroke="#888" />
                                <YAxis stroke="#888" />
                                <Tooltip
                                  contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #333' }}
                                  labelStyle={{ color: '#fff' }}
                                  formatter={(value: any, name: string) => {
                                    if (name === 'oneRepMax') return [`${value} lbs`, '1RM']
                                    return [value, name]
                                  }}
                                />
                                <Line
                                  type="monotone"
                                  dataKey="oneRepMax"
                                  stroke="#00d4ff"
                                  strokeWidth={2}
                                  dot={{ fill: '#00d4ff', r: 4 }}
                                />
                              </LineChart>
                            </ResponsiveContainer>

                            {/* PR History Table */}
                            <div className="mt-6 space-y-2">
                              <h4 className="font-medium text-text-primary mb-3">PR History</h4>
                              {selectedExerciseHistory.reverse().map((entry, index) => (
                                <div key={index} className="flex justify-between items-center p-3 border border-border rounded-lg">
                                  <span className="text-sm text-text-secondary">{entry.date}</span>
                                  <div className="flex items-center space-x-4">
                                    <span className="text-sm text-text-primary">
                                      {entry.weight} lbs × {entry.reps}
                                    </span>
                                    <span className="text-sm font-medium text-primary">
                                      1RM: {entry.oneRepMax} lbs
                                    </span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </>
                        ) : (
                          <div className="text-center py-12 text-text-secondary">
                            No progression data available for this exercise
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          )}
        </div>
      </main>
      <MobileNav />
    </>
  )
}
