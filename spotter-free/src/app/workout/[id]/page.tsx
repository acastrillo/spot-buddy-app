"use client"

import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import { useAuthStore } from "@/store"
import { Login } from "@/components/auth/login"
import { Header } from "@/components/layout/header"
import { MobileNav } from "@/components/layout/mobile-nav"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { 
  ArrowLeft, 
  Clock,
  Target,
  User,
  Brain,
  ExternalLink,
  Edit,
  Play,
  AlertCircle
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
  llmData?: any
  author?: any
  createdAt: string
  updatedAt?: string
  source: string
  type: string
  totalDuration: number
  difficulty: string
  tags: string[]
}

export default function WorkoutViewPage() {
  const { isAuthenticated } = useAuthStore()
  const router = useRouter()
  const params = useParams()
  const [workout, setWorkout] = useState<Workout | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const workoutId = params?.id as string
    if (workoutId) {
      loadWorkout(workoutId)
    }
  }, [params?.id])

  const loadWorkout = (workoutId: string) => {
    try {
      const workouts = JSON.parse(localStorage.getItem('workouts') || '[]')
      const found = workouts.find((w: Workout) => w.id === workoutId)
      setWorkout(found || null)
    } catch (error) {
      console.error('Error loading workout:', error)
      setWorkout(null)
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
          <div className="animate-pulse text-text-secondary">Loading workout...</div>
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
            <Button onClick={() => router.push('/library')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Library
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

  return (
    <>
      <Header />
      <main className="min-h-screen pb-20 md:pb-8">
        <div className="max-w-4xl mx-auto px-4 py-8">
          {/* Header */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => router.push('/library')}
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                <div>
                  <h1 className="text-2xl font-bold text-text-primary">
                    {workout.title}
                  </h1>
                  <p className="text-sm text-text-secondary">
                    {workout.description}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                <Button variant="outline" size="sm">
                  <Edit className="h-4 w-4 mr-2" />
                  Edit
                </Button>
                <Button size="sm" disabled className="opacity-50 cursor-not-allowed">
                  <Play className="h-4 w-4 mr-2" />
                  Coming Soon
                </Button>
              </div>
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
              
              {workout.llmData?.usedLLM && (
                <div className="flex items-center space-x-1 text-primary">
                  <Brain className="h-4 w-4" />
                  <span className="text-sm">AI Enhanced</span>
                </div>
              )}
            </div>

            {/* AI Processing Info */}
            {workout.llmData && (
              <Card className="mb-6">
                <CardHeader className="pb-3">
                  <div className="flex items-center space-x-2">
                    <Brain className="h-4 w-4 text-primary" />
                    <CardTitle className="text-sm">AI Analysis</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  {workout.llmData.summary && (
                    <p className="text-sm text-text-secondary mb-3">
                      {workout.llmData.summary}
                    </p>
                  )}
                  
                  {workout.llmData.breakdown && (
                    <div className="text-xs text-text-secondary space-y-1">
                      {workout.llmData.breakdown.map((item: string, idx: number) => (
                        <div key={idx}>• {item}</div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>

          {/* Exercises */}
          <Card>
            <CardHeader>
              <CardTitle>Exercises ({workout.exercises.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {workout.exercises.map((exercise, idx) => (
                  <div 
                    key={exercise.id} 
                    className="flex items-center justify-between p-4 bg-surface rounded-lg border border-border"
                  >
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-semibold text-sm">
                        {idx + 1}
                      </div>
                      <div>
                        <h3 className="font-medium text-text-primary capitalize">
                          {exercise.name}
                        </h3>
                        {exercise.notes && (
                          <p className="text-xs text-text-secondary mt-1">
                            {exercise.notes}
                          </p>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-6 text-sm text-text-secondary">
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
                  </div>
                ))}
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
                      <span className="text-text-primary text-xs font-mono truncate">
                        {workout.source}
                      </span>
                      <Button variant="outline" size="sm" asChild>
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
    </>
  )
}