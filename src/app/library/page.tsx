"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { useAuthStore } from "@/store"
import { Login } from "@/components/auth/login"
import { Header } from "@/components/layout/header"
import { MobileNav } from "@/components/layout/mobile-nav"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Dumbbell,
  Clock,
  Search,
  Loader2,
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
} from "lucide-react"

interface Workout {
  id: string
  workoutId?: string
  title: string
  description?: string
  exercises: any[]
  totalDuration: number
  difficulty: string
  source: string
  type: string
  createdAt: string
  completionCount?: number
}

export default function LibraryPage() {
  const { isAuthenticated, user } = useAuthStore()
  const router = useRouter()
  const [workouts, setWorkouts] = useState<Workout[]>([])
  const [filteredWorkouts, setFilteredWorkouts] = useState<Workout[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")

  useEffect(() => {
    const loadWorkouts = async () => {
      if (!user?.id) return

      setLoading(true)
      try {
        // Load workouts from API
        const response = await fetch('/api/workouts?limit=1000')
        if (response.ok) {
          const { workouts: apiWorkouts } = await response.json()

          // Fetch completion counts from DynamoDB
          let completionCountMap: Record<string, number> = {}
          try {
            const completionsResponse = await fetch('/api/workouts/completions')
            if (completionsResponse.ok) {
              const { completions } = await completionsResponse.json()

              // Build a map of workoutId -> count
              completionCountMap = completions.reduce((acc: Record<string, number>, completion: any) => {
                const workoutId = completion.workoutId
                acc[workoutId] = (acc[workoutId] || 0) + 1
                return acc
              }, {})
            } else {
              // Fallback to localStorage
              const completedWorkouts = JSON.parse(localStorage.getItem('completedWorkouts') || '[]')
              completionCountMap = completedWorkouts.reduce((acc: Record<string, number>, completion: any) => {
                const workoutId = completion.workoutId
                acc[workoutId] = (acc[workoutId] || 0) + 1
                return acc
              }, {})
            }
          } catch (completionsError) {
            console.error('Error fetching completions:', completionsError)
            // Fallback to localStorage
            const completedWorkouts = JSON.parse(localStorage.getItem('completedWorkouts') || '[]')
            completionCountMap = completedWorkouts.reduce((acc: Record<string, number>, completion: any) => {
              const workoutId = completion.workoutId
              acc[workoutId] = (acc[workoutId] || 0) + 1
              return acc
            }, {})
          }

          // Map workouts and add completion counts
          const workoutsWithStats = apiWorkouts.map((workout: any) => {
            const workoutId = workout.workoutId || workout.id
            const completionCount = completionCountMap[workoutId] || 0

            return {
              id: workoutId,
              workoutId: workoutId,
              title: workout.title,
              description: workout.description,
              exercises: workout.exercises || [],
              totalDuration: workout.totalDuration || 0,
              difficulty: workout.difficulty || 'medium',
              source: workout.source || '',
              type: workout.type || 'manual',
              createdAt: workout.createdAt,
              completionCount,
            }
          })

          // Sort by most recently created
          const sorted = workoutsWithStats.sort((a: Workout, b: Workout) => {
            return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          })

          setWorkouts(sorted)
          setFilteredWorkouts(sorted)
        } else {
          // Fallback to localStorage
          const savedWorkouts = JSON.parse(localStorage.getItem('workouts') || '[]')
          setWorkouts(savedWorkouts)
          setFilteredWorkouts(savedWorkouts)
        }
      } catch (error) {
        console.error('Error loading workouts:', error)
        // Fallback to localStorage
        const savedWorkouts = JSON.parse(localStorage.getItem('workouts') || '[]')
        setWorkouts(savedWorkouts)
        setFilteredWorkouts(savedWorkouts)
      } finally {
        setLoading(false)
      }
    }

    loadWorkouts()
  }, [user?.id])

  useEffect(() => {
    // Filter workouts based on search query
    if (searchQuery.trim() === "") {
      setFilteredWorkouts(workouts)
    } else {
      const query = searchQuery.toLowerCase()
      const filtered = workouts.filter((workout) =>
        workout.title.toLowerCase().includes(query) ||
        workout.description?.toLowerCase().includes(query) ||
        workout.difficulty.toLowerCase().includes(query)
      )
      setFilteredWorkouts(filtered)
    }
  }, [searchQuery, workouts])

  if (!isAuthenticated) {
    return <Login />
  }

  const formatDuration = (minutes: number) => {
    if (minutes < 60) return `${minutes} min`
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`
  }

  return (
    <>
      <Header />
      <main className="min-h-screen pb-20 md:pb-8">
        <div className="max-w-6xl mx-auto px-4 py-8">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => router.back()}
                className="flex-shrink-0"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div>
                <h1 className="text-3xl font-bold text-text-primary">
                  Workout Library
                </h1>
                <p className="text-text-secondary">
                  {workouts.length} {workouts.length === 1 ? 'workout' : 'workouts'} saved
                </p>
              </div>
            </div>

            {/* Search */}
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-secondary" />
              <Input
                type="text"
                placeholder="Search workouts..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* Loading State */}
          {loading && (
            <div className="text-center py-12">
              <Loader2 className="h-12 w-12 text-primary mx-auto mb-4 animate-spin" />
              <p className="text-text-secondary">Loading your workouts...</p>
            </div>
          )}

          {/* Empty State */}
          {!loading && workouts.length === 0 && (
            <Card className="border-0">
              <CardContent className="p-12 text-center">
                <div className="w-16 h-16 bg-surface rounded-full flex items-center justify-center mx-auto mb-4">
                  <Dumbbell className="h-8 w-8 text-text-secondary" />
                </div>
                <h3 className="text-lg font-medium text-text-primary mb-2">
                  No workouts yet
                </h3>
                <p className="text-text-secondary mb-6 max-w-md mx-auto">
                  Start building your workout library by importing or creating your first workout.
                </p>
                <Link href="/add">
                  <Button size="lg">
                    Add Your First Workout
                  </Button>
                </Link>
              </CardContent>
            </Card>
          )}

          {/* No Search Results */}
          {!loading && workouts.length > 0 && filteredWorkouts.length === 0 && (
            <Card className="border-0">
              <CardContent className="p-12 text-center">
                <AlertCircle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-text-primary mb-2">
                  No workouts found
                </h3>
                <p className="text-text-secondary">
                  Try a different search term or clear your search.
                </p>
              </CardContent>
            </Card>
          )}

          {/* Workout Grid */}
          {!loading && filteredWorkouts.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredWorkouts.map((workout) => (
                <Link
                  key={workout.id}
                  href={`/workout/${workout.id}`}
                  className="group"
                >
                  <Card className="h-full border-0 hover:shadow-lg transition-all duration-200 cursor-pointer">
                    <CardContent className="p-5">
                      {/* Title */}
                      <h3 className="text-lg font-semibold text-text-primary mb-2 line-clamp-2 group-hover:text-primary transition-colors">
                        {workout.title}
                      </h3>

                      {/* Description */}
                      {workout.description && (
                        <p className="text-sm text-text-secondary mb-4 line-clamp-2">
                          {workout.description}
                        </p>
                      )}

                      {/* Stats */}
                      <div className="space-y-2 mb-4">
                        <div className="flex items-center justify-between text-sm">
                          <div className="flex items-center space-x-2 text-text-secondary">
                            <Clock className="h-4 w-4" />
                            <span>{formatDuration(workout.totalDuration)}</span>
                          </div>
                          <div className="flex items-center space-x-2 text-text-secondary">
                            <Dumbbell className="h-4 w-4" />
                            <span>{workout.exercises.length} exercises</span>
                          </div>
                        </div>

                        <div className="flex items-center justify-between text-sm">
                          <div className="flex items-center space-x-2">
                            <div className={`px-2 py-0.5 rounded text-xs font-medium ${
                              workout.difficulty === 'easy'
                                ? 'bg-green-500/10 text-green-500'
                                : workout.difficulty === 'hard'
                                ? 'bg-red-500/10 text-red-500'
                                : 'bg-yellow-500/10 text-yellow-500'
                            }`}>
                              {workout.difficulty}
                            </div>
                          </div>
                          {workout.completionCount !== undefined && workout.completionCount > 0 && (
                            <div className="flex items-center space-x-1 text-success">
                              <CheckCircle2 className="h-4 w-4" />
                              <span className="font-medium">{workout.completionCount}x</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Footer */}
                      <div className="pt-3 border-t border-border/50">
                        <p className="text-xs text-text-secondary">
                          Added {new Date(workout.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </div>
      </main>
      <MobileNav />
    </>
  )
}
