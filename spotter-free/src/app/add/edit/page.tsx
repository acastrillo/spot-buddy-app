"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuthStore } from "@/store"
import { Login } from "@/components/auth/login"
import { Header } from "@/components/layout/header"
import { MobileNav } from "@/components/layout/mobile-nav"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { EditableWorkoutTable } from "@/lib/editable-workout-table"
import { 
  Save, 
  ArrowLeft, 
  Brain,
  AlertCircle
} from "lucide-react"

interface WorkoutData {
  id: string
  title: string
  content: string
  llmData?: any
  author?: any
  createdAt: string
  source: string
  type: string
}

export default function EditWorkoutPage() {
  const { isAuthenticated } = useAuthStore()
  const router = useRouter()
  const [workoutData, setWorkoutData] = useState<WorkoutData | null>(null)
  const [workoutTitle, setWorkoutTitle] = useState("")
  const [workoutDescription, setWorkoutDescription] = useState("")
  const [exercises, setExercises] = useState<any[]>([])
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    // Load workout data from sessionStorage
    const stored = sessionStorage.getItem('workoutToEdit')
    if (stored) {
      const data = JSON.parse(stored)
      setWorkoutData(data)
      setWorkoutTitle(data.title || '')
      setWorkoutDescription(data.llmData?.summary || '')
      
      // Convert LLM exercises to editable format
      if (data.llmData?.exercises && data.llmData.exercises.length > 0) {
        setExercises(data.llmData.exercises.map((exercise: any) => ({
          id: exercise.id || `ex-${Date.now()}-${Math.random()}`,
          name: exercise.movement || '',
          sets: exercise.sets || 1,
          reps: exercise.reps || '',
          weight: exercise.weight || '',
          restSeconds: exercise.restSeconds || 60,
          notes: exercise.notes || ''
        })))
      } else if (data.llmData?.rows) {
        // Fallback to old rows format
        setExercises(data.llmData.rows.map((row: any) => ({
          id: row.id || `ex-${Date.now()}-${Math.random()}`,
          name: row.movement || '',
          sets: row.sets || 1,
          reps: row.reps || '',
          weight: row.weight || '',
          restSeconds: 60,
          notes: row.notes || ''
        })))
      }
    } else {
      // No data found, redirect back
      router.push('/add')
    }
  }, [router])

  if (!isAuthenticated) {
    return <Login />
  }

  if (!workoutData) {
    return (
      <>
        <Header />
        <main className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <AlertCircle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-text-primary mb-2">
              No Workout Data Found
            </h2>
            <p className="text-text-secondary mb-4">
              Please go back and import a workout first.
            </p>
            <Button onClick={() => router.push('/add')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Import
            </Button>
          </div>
        </main>
      </>
    )
  }

  const handleSave = async () => {
    setIsSaving(true)
    try {
      // Create final workout object
      const finalWorkout = {
        id: workoutData.id,
        title: workoutTitle,
        description: workoutDescription,
        exercises: exercises,
        content: workoutData.content,
        llmData: workoutData.llmData,
        author: workoutData.author,
        createdAt: workoutData.createdAt,
        updatedAt: new Date().toISOString(),
        source: workoutData.source,
        type: workoutData.type,
        totalDuration: workoutData.llmData?.workoutV1?.totalDuration || estimateDuration(exercises),
        difficulty: workoutData.llmData?.workoutV1?.difficulty || 'moderate',
        tags: workoutData.llmData?.workoutV1?.tags || []
      }

      // Save to localStorage
      const existingWorkouts = JSON.parse(localStorage.getItem('workouts') || '[]')
      existingWorkouts.push(finalWorkout)
      localStorage.setItem('workouts', JSON.stringify(existingWorkouts))

      // Clear session storage
      sessionStorage.removeItem('workoutToEdit')

      // Navigate to workout view
      router.push(`/workout/${finalWorkout.id}`)
      
    } catch (error) {
      console.error('Save error:', error)
      alert('Failed to save workout')
    } finally {
      setIsSaving(false)
    }
  }

  const estimateDuration = (exercises: any[]) => {
    // Basic duration estimation: 2 minutes per exercise
    return Math.max(exercises.length * 2, 15)
  }

  return (
    <>
      <Header />
      <main className="min-h-screen pb-20 md:pb-8">
        <div className="max-w-6xl mx-auto px-4 py-8">
          {/* Header */}
          <div className="mb-6">
            <div className="flex items-center space-x-3 mb-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => router.push('/add')}
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-text-primary">
                  Edit Workout
                </h1>
                <p className="text-sm text-text-secondary">
                  Review and customize your AI-processed workout
                </p>
              </div>
            </div>

            {/* AI Processing Info */}
            {workoutData.llmData && (
              <div className="mb-6 p-4 bg-primary/10 border border-primary/20 rounded-lg">
                <div className="flex items-center space-x-2 mb-2">
                  <Brain className="h-4 w-4 text-primary" />
                  <span className="text-sm text-primary font-medium">
                    AI Enhanced Workout
                    {workoutData.llmData.usedLLM && (
                      <span className="text-xs ml-1">({workoutData.llmData.usedLLM})</span>
                    )}
                  </span>
                </div>
                
                {workoutData.llmData.breakdown && (
                  <div className="text-xs text-text-secondary space-y-1">
                    {workoutData.llmData.breakdown.map((item: string, idx: number) => (
                      <div key={idx}>• {item}</div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="grid lg:grid-cols-3 gap-6">
            {/* Workout Details */}
            <div className="lg:col-span-1">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Workout Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-text-primary mb-2">
                      Workout Name
                    </label>
                    <Input
                      value={workoutTitle}
                      onChange={(e) => setWorkoutTitle(e.target.value)}
                      placeholder="Enter workout name..."
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-text-primary mb-2">
                      Description
                    </label>
                    <Textarea
                      value={workoutDescription}
                      onChange={(e) => setWorkoutDescription(e.target.value)}
                      placeholder="Brief description of the workout..."
                      rows={3}
                    />
                  </div>

                  <div className="pt-4 border-t border-border">
                    <h4 className="font-medium text-text-primary mb-2">Summary</h4>
                    <div className="text-sm text-text-secondary space-y-1">
                      <div>Exercises: {exercises.length}</div>
                      <div>Est. Duration: {estimateDuration(exercises)} min</div>
                      <div>Source: {workoutData.source === 'manual' ? 'Manual Entry' : 'Instagram'}</div>
                      {workoutData.author && (
                        <div>From: @{workoutData.author.username}</div>
                      )}
                    </div>
                  </div>

                  <Button 
                    className="w-full mt-6" 
                    onClick={handleSave}
                    disabled={!workoutTitle.trim() || exercises.length === 0 || isSaving}
                  >
                    {isSaving ? (
                      <>Saving...</>
                    ) : (
                      <>
                        <Save className="h-4 w-4 mr-2" />
                        Save Workout
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            </div>

            {/* Exercise Table */}
            <div className="lg:col-span-2">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Exercises</CardTitle>
                </CardHeader>
                <CardContent>
                  <EditableWorkoutTable
                    exercises={exercises}
                    onExercisesChange={setExercises}
                  />
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