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
import { WorkoutCardList } from "@/components/workout/workout-card-list"
import { AMRAPHeaderCard } from "@/components/workout/amrap-header-card"
import { expandWorkoutToCards, collapseCardsToExercises, detectRepetitionPattern } from "@/lib/workout/card-transformer"
import type { WorkoutCard } from "@/types/workout-card"
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
  const [cards, setCards] = useState<WorkoutCard[]>([])  // Changed from exercises
  const [isSaving, setIsSaving] = useState(false)
  const [workoutType, setWorkoutType] = useState<string>('standard')
  const [workoutStructure, setWorkoutStructure] = useState<any>(null)
  const [amrapTimeLimit, setAmrapTimeLimit] = useState<number>(1200) // Default 20 min

  useEffect(() => {
    // Load workout data from sessionStorage
    const stored = sessionStorage.getItem('workoutToEdit')
    if (stored) {
      const data = JSON.parse(stored)
      setWorkoutData(data)
      setWorkoutTitle(String(data.title || ''))

      // Merge AI Notes into Notes field
      let notesContent = String(data.llmData?.summary || '')
      if (data.llmData?.aiNotes && Array.isArray(data.llmData.aiNotes)) {
        const aiNotesText = data.llmData.aiNotes
          .filter((note: any) => note && typeof note === 'string')
          .map((note: string) => `• ${note}`)
          .join('\n')

        if (aiNotesText) {
          notesContent = notesContent
            ? `${notesContent}\n\n**AI Insights:**\n${aiNotesText}`
            : `**AI Insights:**\n${aiNotesText}`
        }
      }
      setWorkoutDescription(notesContent)

      // Convert parsed exercises to card format
      let exerciseData = []
      if (data.llmData?.exercises && data.llmData.exercises.length > 0) {
        exerciseData = data.llmData.exercises.map((exercise: any) => ({
          id: exercise.id || `ex-${Date.now()}-${Math.random()}`,
          name: exercise.name || exercise.movement || '',
          sets: exercise.sets || 1,
          reps: exercise.reps || '',
          weight: exercise.weight || '',
          distance: exercise.distance || null,
          timing: exercise.timing || null,
          restSeconds: exercise.restSeconds || 60,
          notes: exercise.notes || ''
        }))
      } else if (data.llmData?.rows) {
        // Fallback to old rows format
        exerciseData = data.llmData.rows.map((row: any) => ({
          id: row.id || `ex-${Date.now()}-${Math.random()}`,
          name: row.movement || '',
          sets: row.sets || 1,
          reps: row.reps || '',
          weight: row.weight || '',
          restSeconds: 60,
          notes: row.notes || ''
        }))
      }

      // Detect repetition pattern and expand to cards
      // For "rounds" workout type, use structure.rounds instead of exercise.sets
      let repetition = detectRepetitionPattern(exerciseData, data.llmData?.workoutType)

      // Override for rounds-based workouts
      if (data.llmData?.workoutType === 'rounds' && data.llmData?.structure?.rounds) {
        repetition = {
          rounds: data.llmData.structure.rounds,
          pattern: 'circuit' as const,
          restBetweenExercises: false,  // No rest between exercises in same round
          restBetweenRounds: true,  // Rest between rounds
          defaultRestDuration: 60,
        }
      }

      // Load AMRAP data
      if (data.llmData?.workoutType === 'amrap') {
        setWorkoutType('amrap')
        const timeLimitSeconds = data.llmData?.structure?.timeLimit || 1200
        setAmrapTimeLimit(timeLimitSeconds)
      }

      const expandedCards = expandWorkoutToCards(exerciseData, repetition)
      setCards(expandedCards)

      // Auto-fill workout title from first exercise if title is empty
      if (!data.title && exerciseData.length > 0 && exerciseData[0].name) {
        setWorkoutTitle(String(exerciseData[0].name))
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
      // Collapse cards back to exercises for saving
      const exercises = collapseCardsToExercises(cards)

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
        structure: workoutType === 'amrap' ? {
          timeLimit: amrapTimeLimit
        } : workoutStructure,
        aiNotes: null,  // AI notes now merged into description
        aiEnhanced: workoutDescription.includes('**AI Insights:**'), // Mark as AI enhanced if description contains AI insights
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
    // Update title if provided
    if (enhancedWorkout.title) {
      setWorkoutTitle(String(enhancedWorkout.title))
    }

    // Merge AI notes into description field
    let updatedDescription = workoutDescription
    if (enhancedWorkout.description) {
      updatedDescription = String(enhancedWorkout.description)
    }

    // Append AI notes to description
    if (enhancedWorkout.aiNotes && Array.isArray(enhancedWorkout.aiNotes)) {
      const aiNotesText = enhancedWorkout.aiNotes
        .filter((note: any) => note && typeof note === 'string')
        .map((note: string) => `• ${note}`)
        .join('\n')

      if (aiNotesText) {
        updatedDescription = updatedDescription
          ? `${updatedDescription}\n\n**AI Insights:**\n${aiNotesText}`
          : `**AI Insights:**\n${aiNotesText}`
      }
    }
    setWorkoutDescription(updatedDescription)

    // Update workout type and structure
    if (enhancedWorkout.workoutType) {
      setWorkoutType(enhancedWorkout.workoutType)
    }
    if (enhancedWorkout.structure) {
      setWorkoutStructure(enhancedWorkout.structure)
    }

    // Convert enhanced exercises to card format
    if (enhancedWorkout.exercises && enhancedWorkout.exercises.length > 0) {
      const exerciseData = enhancedWorkout.exercises.map((exercise: any) => ({
        id: exercise.id || `ex-${Date.now()}-${Math.random()}`,
        name: exercise.name || '',
        sets: exercise.sets || 1,
        reps: exercise.reps || '',
        weight: exercise.weight || '',
        distance: exercise.distance || null,
        timing: exercise.timing || null,
        restSeconds: exercise.restSeconds || null,
        notes: exercise.notes || '',
        duration: exercise.duration || null,
      }))

      // Detect repetition pattern and expand to cards
      // For "rounds" workout type, use structure.rounds instead of exercise.sets
      let repetition = detectRepetitionPattern(exerciseData, enhancedWorkout.workoutType)

      // Override for rounds-based workouts
      if (enhancedWorkout.workoutType === 'rounds' && enhancedWorkout.structure?.rounds) {
        repetition = {
          rounds: enhancedWorkout.structure.rounds,
          pattern: 'circuit' as const,
          restBetweenExercises: false,  // No rest between exercises in same round
          restBetweenRounds: true,  // Rest between rounds
          defaultRestDuration: 60,
        }
      }

      const expandedCards = expandWorkoutToCards(exerciseData, repetition)
      setCards(expandedCards)

      // Auto-fill title from first exercise if not provided
      if (!enhancedWorkout.title && !workoutTitle && exerciseData.length > 0 && exerciseData[0].name) {
        setWorkoutTitle(String(exerciseData[0].name))
      }
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
                  Create New Workout
                </h1>
                <p className="text-sm text-text-secondary">
                  Review and save your imported workout
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
                  <div className="text-xs text-text-secondary space-y-1 mb-3">
                    {workoutData.llmData.breakdown.map((item: string, idx: number) => (
                      <div key={idx}>• {item}</div>
                    ))}
                  </div>
                )}

                {/* Full Caption Display */}
                {workoutData.content && (
                  <div className="mt-3 pt-3 border-t border-primary/20">
                    <h4 className="text-xs font-medium text-primary mb-2">
                      Original Caption:
                    </h4>
                    <div className="text-xs text-text-secondary whitespace-pre-wrap bg-surface/50 rounded p-2 max-h-32 overflow-y-auto">
                      {workoutData.content}
                    </div>
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
                      placeholder="Describe this workout (goals, intensity, focus areas...)"
                      rows={5}
                    />
                  </div>

                  {workoutType === 'amrap' && (
                    <AMRAPHeaderCard
                      timeLimit={amrapTimeLimit}
                      onTimeLimitChange={setAmrapTimeLimit}
                      isEditable={true}
                    />
                  )}

                  <div className="pt-4 border-t border-border">
                    <h4 className="font-medium text-text-primary mb-2">Summary</h4>
                    <div className="text-sm text-text-secondary space-y-1">
                      <div>Cards: {cards.length}</div>
                      <div>Exercises: {cards.filter(c => c.type === 'exercise').length}</div>
                      <div>Est. Duration: {estimateDuration(collapseCardsToExercises(cards))} min</div>
                      <div>Source: {workoutData.source === 'manual' ? 'Manual Entry' : 'Instagram'}</div>
                      {workoutData.author && (
                        <div>From: @{workoutData.author.username}</div>
                      )}
                    </div>
                  </div>

                  <Button
                    className="w-full mt-6"
                    onClick={handleSave}
                    disabled={!workoutTitle || typeof workoutTitle !== 'string' || !workoutTitle.trim() || cards.length === 0 || isSaving}
                  >
                    {isSaving ? (
                      <>Creating Workout...</>
                    ) : (
                      <>
                        <Save className="h-4 w-4 mr-2" />
                        Save New Workout
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            </div>

            {/* Exercise Cards */}
            <div className="lg:col-span-2">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Workout Cards</CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    Tap a card to edit; drag the handle to reorder. Empty fields auto-hide.
                  </p>
                </CardHeader>
                <CardContent>
                  <WorkoutCardList
                    cards={cards}
                    onCardsChange={setCards}
                    showAddButton={true}
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
