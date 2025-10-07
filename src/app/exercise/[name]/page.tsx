"use client"

import { useState, useEffect, use } from "react"
import { useAuthStore } from "@/store"
import { Login } from "@/components/auth/login"
import { Header } from "@/components/layout/header"
import { MobileNav } from "@/components/layout/mobile-nav"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts"
import { Trophy, TrendingUp, Dumbbell, Calendar, Activity, ArrowLeft } from "lucide-react"
import { dynamoDBWorkouts } from "@/lib/dynamodb"
import {
  getExerciseHistory,
  calculateAverageWeight,
  calculateAverageReps,
  getExerciseFrequency,
  categorizeExerciseByMuscleGroup,
} from "@/lib/exercise-history"
import {
  identifyPRs,
  getPRsForExercise,
  calculateOneRepMax,
  formatWeight,
  formatOneRepMax,
} from "@/lib/pr-calculator"
import { LoadingSpinner } from "@/components/ui/loading-spinner"
import Link from "next/link"

interface Props {
  params: Promise<{ name: string }>
}

export default function ExerciseDetailPage({ params }: Props) {
  const { isAuthenticated, user } = useAuthStore()
  const resolvedParams = use(params)
  const exerciseName = decodeURIComponent(resolvedParams.name)

  const [isLoading, setIsLoading] = useState(true)
  const [history, setHistory] = useState<any[]>([])
  const [prs, setPRs] = useState<any[]>([])

  useEffect(() => {
    loadExerciseData()
  }, [user?.id, exerciseName])

  async function loadExerciseData() {
    if (!user?.id) return

    setIsLoading(true)
    try {
      const workouts = await dynamoDBWorkouts.list(user.id)
      const exerciseHistory = getExerciseHistory(workouts, exerciseName)
      const allExercises = exerciseHistory

      setHistory(exerciseHistory)

      // Calculate PRs
      const allPRs = identifyPRs(allExercises)
      const exercisePRs = getPRsForExercise(allPRs, exerciseName)
      setPRs(exercisePRs)
    } catch (error) {
      console.error("Error loading exercise data:", error)
    } finally {
      setIsLoading(false)
    }
  }

  if (!isAuthenticated) {
    return <Login />
  }

  const muscleGroup = categorizeExerciseByMuscleGroup(exerciseName)
  const frequency = history.length
  const avgWeight = calculateAverageWeight(history)
  const avgReps = calculateAverageReps(history)

  // Prepare chart data for weight progression
  const weightChartData = history
    .slice(0, 20)
    .reverse()
    .map((exercise, index) => {
      const maxWeight = Math.max(...exercise.sets.map((s: any) => s.weight))
      return {
        date: new Date(exercise.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        weight: maxWeight,
        oneRepMax: calculateOneRepMax(maxWeight, exercise.sets[0]?.reps || 1),
      }
    })

  // Prepare volume chart data
  const volumeChartData = history
    .slice(0, 20)
    .reverse()
    .map(exercise => {
      const totalVolume = exercise.sets.reduce(
        (sum: number, set: any) => sum + (set.weight * set.reps),
        0
      )
      return {
        date: new Date(exercise.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        volume: totalVolume,
      }
    })

  return (
    <>
      <Header />
      <main className="min-h-screen pb-20 md:pb-4">
        <div className="w-full max-w-4xl mx-auto px-4 py-8 space-y-6">
          <div className="flex items-center gap-4">
            <Link href="/library">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
            </Link>
          </div>

          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold text-text-primary">{exerciseName}</h1>
              <p className="text-text-secondary mt-1">{muscleGroup}</p>
            </div>
            <Dumbbell className="h-8 w-8 text-primary" />
          </div>

          {isLoading ? (
            <LoadingSpinner text="Loading exercise data..." />
          ) : history.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Activity className="h-12 w-12 mx-auto text-text-secondary mb-4" />
                <p className="text-text-secondary">No history for this exercise yet.</p>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Stats Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium text-text-secondary">
                      Times Performed
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-primary" />
                      <span className="text-2xl font-bold">{frequency}</span>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium text-text-secondary">
                      Avg Weight
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-2">
                      <Dumbbell className="h-4 w-4 text-primary" />
                      <span className="text-2xl font-bold">{Math.round(avgWeight)}</span>
                      <span className="text-sm text-text-secondary">lbs</span>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium text-text-secondary">
                      Avg Reps
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-2">
                      <Activity className="h-4 w-4 text-primary" />
                      <span className="text-2xl font-bold">{Math.round(avgReps)}</span>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium text-text-secondary">
                      PRs
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-2">
                      <Trophy className="h-4 w-4 text-primary" />
                      <span className="text-2xl font-bold">{prs.length}</span>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Personal Records */}
              {prs.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Trophy className="h-5 w-5 text-primary" />
                      Personal Records
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {prs.slice(0, 5).map((pr, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between p-3 rounded-lg bg-surface"
                        >
                          <div>
                            <div className="font-medium text-text-primary">
                              {formatWeight(pr.weight, 'lbs')} × {pr.reps} reps
                            </div>
                            <div className="text-sm text-text-secondary">
                              Est. 1RM: {formatOneRepMax(pr.estimatedOneRepMax)}
                            </div>
                          </div>
                          <div className="text-right text-sm text-text-secondary">
                            {new Date(pr.date).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Weight Progression Chart */}
              {weightChartData.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <TrendingUp className="h-5 w-5 text-primary" />
                      Weight Progression
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart data={weightChartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                        <XAxis
                          dataKey="date"
                          stroke="#9CA3AF"
                          tick={{ fill: '#9CA3AF' }}
                        />
                        <YAxis
                          stroke="#9CA3AF"
                          tick={{ fill: '#9CA3AF' }}
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: '#1F2937',
                            border: '1px solid #374151',
                            borderRadius: '0.375rem',
                          }}
                        />
                        <Legend />
                        <Line
                          type="monotone"
                          dataKey="weight"
                          stroke="#06B6D4"
                          strokeWidth={2}
                          dot={{ fill: '#06B6D4', r: 4 }}
                          name="Max Weight (lbs)"
                        />
                        <Line
                          type="monotone"
                          dataKey="oneRepMax"
                          stroke="#A78BFA"
                          strokeWidth={2}
                          strokeDasharray="5 5"
                          dot={{ fill: '#A78BFA', r: 4 }}
                          name="Est. 1RM (lbs)"
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              )}

              {/* Volume Chart */}
              {volumeChartData.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Activity className="h-5 w-5 text-primary" />
                      Volume Progression
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={volumeChartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                        <XAxis
                          dataKey="date"
                          stroke="#9CA3AF"
                          tick={{ fill: '#9CA3AF' }}
                        />
                        <YAxis
                          stroke="#9CA3AF"
                          tick={{ fill: '#9CA3AF' }}
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: '#1F2937',
                            border: '1px solid #374151',
                            borderRadius: '0.375rem',
                          }}
                        />
                        <Legend />
                        <Bar
                          dataKey="volume"
                          fill="#06B6D4"
                          name="Total Volume (lbs)"
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              )}

              {/* Workout History */}
              <Card>
                <CardHeader>
                  <CardTitle>Workout History</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {history.slice(0, 10).map((exercise, index) => (
                      <div
                        key={index}
                        className="p-4 rounded-lg bg-surface space-y-2"
                      >
                        <div className="flex items-center justify-between">
                          <div className="text-sm text-text-secondary">
                            {new Date(exercise.date).toLocaleDateString('en-US', {
                              weekday: 'short',
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                            })}
                          </div>
                          <Link href={`/workout/${exercise.workoutId}`}>
                            <Button variant="ghost" size="sm">
                              View Workout
                            </Button>
                          </Link>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                          {exercise.sets.map((set: any, setIndex: number) => (
                            <div
                              key={setIndex}
                              className="text-sm p-2 rounded bg-background text-center"
                            >
                              <span className="font-medium">{set.weight} lbs</span>
                              <span className="text-text-secondary"> × {set.reps}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </main>
      <MobileNav />
    </>
  )
}
