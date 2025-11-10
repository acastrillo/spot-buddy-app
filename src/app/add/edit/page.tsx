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
import { EditableWorkoutTable } from "@/store/editable-workout-table"
import {
  Save,
  ArrowLeft,
  CheckCircle,
  AlertCircle,
  Sparkles
} from "lucide-react"
import { WorkoutEnhancerButton } from "@/components/ai/workout-enhancer-button"

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
  const { isAuthenticated, user } = useAuthStore()
  const router = useRouter()
  const [workoutData, setWorkoutData] = useState<WorkoutData | null>(null)
  const [workoutTitle, setWorkoutTitle] = useState("")
  const [workoutDescription, setWorkoutDescription] = useState("")
  const [exercises, setExercises] = useState<any[]>([])
  const [aiNotes, setAiNotes] = useState<string[]>([])
  const [isSaving, setIsSaving] = useState(false)
  const [workoutType, setWorkoutType] = useState<string>('standard')
  const [workoutStructure, setWorkoutStructure] = useState<any>(null)

  useEffect(() => {
    // Load workout data from sessionStorage
    const stored = sessionStorage.getItem('workoutToEdit')
    if (stored) {
      const data = JSON.parse(stored)
      setWorkoutData(data)
      setWorkoutTitle(data.title || '')
      setWorkoutDescription(data.llmData?.summary || '')
      
      // Convert parsed exercises to editable format
      if (data.llmData?.exercises && data.llmData.exercises.length > 0) {
        setExercises(data.llmData.exercises.map((exercise: any) => ({
          id: exercise.id || `ex-${Date.now()}-${Math.random()}`,
          name: exercise.name || exercise.movement || '',
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
    if (!user?.id) {
      alert('You must be logged in to save workouts')
      return
    }

    setIsSaving(true)
    try {
      // Prepare workout data for DynamoDB
      const workoutToSave = {
        workoutId: workoutData.id,
        title: workoutTitle,
        description: workoutDescription,
        exercises: exercises,
        content: workoutData.content,
        author: workoutData.author,
        createdAt: workoutData.createdAt,
        source: workoutData.source,
        type: workoutData.type,
        totalDuration: workoutData.llmData?.workoutV1?.totalDuration || estimateDuration(exercises),
        difficulty: workoutData.llmData?.workoutV1?.difficulty || 'moderate',
        tags: workoutData.llmData?.workoutV1?.tags || [],
        llmData: workoutData.llmData,
        workoutType: workoutType,
        structure: workoutStructure,
        aiNotes: aiNotes.length > 0 ? aiNotes : null,
        aiEnhanced: aiNotes.length > 0, // Mark as AI enhanced if we have AI notes
      }

      // Save to DynamoDB via API route
      const response = await fetch('/api/workouts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(workoutToSave),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to save workout')
      }

      const { workout } = await response.json()

      // Also save to localStorage as fallback/cache
      const existingWorkouts = JSON.parse(localStorage.getItem('workouts') || '[]')
      const finalWorkout = {
        id: workout.workoutId,
        ...workout,
        updatedAt: new Date().toISOString(),
      }
      existingWorkouts.push(finalWorkout)
      localStorage.setItem('workouts', JSON.stringify(existingWorkouts))

      // Clear session storage
      sessionStorage.removeItem('workoutToEdit')

      // Navigate to workout view
      router.push(`/workout/${workout.workoutId}`)

    } catch (error) {
      console.error('Save error:', error)
      alert('Failed to save workout. Please try again.')
    } finally {
      setIsSaving(false)
    }
  }

  const estimateDuration = (exercises: any[]) => {
    // Basic duration estimation: 2 minutes per exercise
    return Math.max(exercises.length * 2, 15)
  }

  const handleAIEnhancement = (enhancedWorkout: any) => {
    // Update exercises from AI enhancement
    if (enhancedWorkout.exercises && enhancedWorkout.exercises.length > 0) {
      setExercises(enhancedWorkout.exercises.map((exercise: any) => ({
        id: exercise.id || `ex-${Date.now()}-${Math.random()}`,
        name: exercise.name || '',
        sets: exercise.sets || 1,
        reps: exercise.reps || '',
        weight: exercise.weight || '',
        restSeconds: exercise.restSeconds || null,
        notes: exercise.notes || '',
        duration: exercise.duration || null,
      })))
    }

    // Update AI notes - filter to ensure all items are valid strings
    if (enhancedWorkout.aiNotes && Array.isArray(enhancedWorkout.aiNotes)) {
      setAiNotes(enhancedWorkout.aiNotes.filter((note: any) => note && typeof note === 'string'))
    }

    // Update title and description if provided
    if (enhancedWorkout.title) {
      setWorkoutTitle(enhancedWorkout.title)
    }
    if (enhancedWorkout.description) {
      setWorkoutDescription(enhancedWorkout.description)
    }

    // Update workout type and structure
    if (enhancedWorkout.workoutType) {
      setWorkoutType(enhancedWorkout.workoutType)
    }
    if (enhancedWorkout.structure) {
      setWorkoutStructure(enhancedWorkout.structure)
    }
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
                  Review and customize your imported workout
                </p>
              </div>
            </div>

            {/* Import Info */}
            {workoutData.llmData && (
              <div className="mb-6 p-4 bg-primary/10 border border-primary/20 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="h-4 w-4 text-primary" />
                    <span className="text-sm text-primary font-medium">
                      Imported Workout
                    </span>
                  </div>

                  {/* AI Enhancement Button */}
                  <WorkoutEnhancerButton
                    rawText={workoutData.content}
                    onEnhanced={handleAIEnhancement}
                    size="sm"
                    variant="outline"
                  />
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

            {/* Workout Structure Display */}
            {workoutType && workoutType !== 'standard' && (
              <div className="mb-6 p-4 bg-secondary/10 border border-secondary/20 rounded-lg">
                <div className="flex items-center space-x-2 mb-2">
                  <Sparkles className="h-4 w-4 text-secondary" />
                  <span className="text-sm text-secondary font-medium uppercase">
                    {workoutType.toUpperCase()} Workout
                  </span>
                </div>

                {workoutStructure && (
                  <div className="text-xs text-text-secondary space-y-1">
                    {workoutStructure.rounds && (
                      <div>• Rounds: {workoutStructure.rounds}</div>
                    )}
                    {workoutStructure.timePerRound && (
                      <div>• Time per Round: {workoutStructure.timePerRound}s ({Math.floor(workoutStructure.timePerRound / 60)}min)</div>
                    )}
                    {workoutStructure.timeLimit && (
                      <div>• Time Limit: {workoutStructure.timeLimit}s ({Math.floor(workoutStructure.timeLimit / 60)}min)</div>
                    )}
                    {workoutStructure.totalTime && (
                      <div>• Total Time: {workoutStructure.totalTime}s ({Math.floor(workoutStructure.totalTime / 60)}min)</div>
                    )}
                    {workoutStructure.pattern && (
                      <div>• Pattern: {workoutStructure.pattern}</div>
                    )}
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

              {/* AI Notes Section */}
              {aiNotes.length > 0 && (
                <Card className="mt-4">
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Sparkles className="h-5 w-5 text-primary" />
                      AI Notes
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {aiNotes.filter(note => note && typeof note === 'string').map((note, index) => (
                        <div
                          key={index}
                          className="flex items-start gap-2 p-3 rounded-lg bg-surface-elevated border border-border"
                        >
                          <div className="w-1 h-1 rounded-full bg-primary mt-2 flex-shrink-0" />
                          <p className="text-sm text-text-secondary">{note}</p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </div>
      </main>
      <MobileNav />
    </>
  )
}