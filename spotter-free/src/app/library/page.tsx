"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useAuthStore } from "@/store"
import { Login } from "@/components/auth/login"
import { Header } from "@/components/layout/header"
import { MobileNav } from "@/components/layout/mobile-nav"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
// import { extractWorkoutFromImage, ParsedWorkout } from "@/lib/extractWorkoutFromImage" // Temporarily disabled
import { 
  Plus, 
  Search, 
  Filter, 
  Dumbbell, 
  Clock, 
  Calendar,
  MoreHorizontal,
  Play,
  CheckCircle,
  CalendarDays,
  Camera,
  Upload,
  Loader2
} from "lucide-react"

export default function LibraryPage() {
  const { isAuthenticated } = useAuthStore()
  const [searchQuery, setSearchQuery] = useState("")
  const [activeFilter, setActiveFilter] = useState("All")
  const [workouts, setWorkouts] = useState<any[]>([])
  const [showDatePicker, setShowDatePicker] = useState<string | null>(null)
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
  const [isProcessingImage, setIsProcessingImage] = useState(false)
  const [showOCRResult, setShowOCRResult] = useState<any | null>(null)

  useEffect(() => {
    // Load workouts from localStorage
    const savedWorkouts = JSON.parse(localStorage.getItem('workouts') || '[]')
    setWorkouts(savedWorkouts)
  }, [])

  const handleMarkCompleted = (workoutId: string) => {
    const completionDate = new Date(selectedDate).toISOString()
    
    // Get existing completions
    const existingCompletions = JSON.parse(localStorage.getItem('completedWorkouts') || '[]')
    
    // Add new completion
    const newCompletion = {
      id: Date.now().toString(),
      workoutId,
      completedAt: completionDate,
      completedDate: selectedDate
    }
    
    existingCompletions.push(newCompletion)
    localStorage.setItem('completedWorkouts', JSON.stringify(existingCompletions))
    
    setShowDatePicker(null)
    alert(`Workout marked as completed on ${selectedDate}!`)
  }

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setIsProcessingImage(true)
    try {
      // const result = await extractWorkoutFromImage(file, { 
      //   preferServer: false, // Use client-side Tesseract.js by default
      //   lang: 'eng'
      // })
      // setShowOCRResult(result)
      alert('Image processing temporarily disabled')
    } catch (error) {
      console.error('OCR processing failed:', error)
      alert('Failed to process image. Please try again.')
    } finally {
      setIsProcessingImage(false)
    }
  }

  const handleSaveOCRWorkout = () => {
    if (!showOCRResult) return

    const workout = {
      id: Date.now().toString(),
      title: showOCRResult.title || 'OCR Workout',
      content: showOCRResult.rawText,
      createdAt: new Date().toISOString(),
      parsedData: {
        style: showOCRResult.style,
        duration_min: showOCRResult.duration_min,
        interval_sec: showOCRResult.interval_sec,
        rounds: showOCRResult.rounds,
        exercises: showOCRResult.sections.flatMap((section: any) => section.exercises),
        equipment: [], // Could be derived from exercises
        ocr: showOCRResult.ocr,
        warnings: showOCRResult.warnings
      }
    }

    const existingWorkouts = JSON.parse(localStorage.getItem('workouts') || '[]')
    existingWorkouts.push(workout)
    localStorage.setItem('workouts', JSON.stringify(existingWorkouts))
    setWorkouts(existingWorkouts)
    setShowOCRResult(null)
    alert('Workout saved successfully!')
  }

  if (!isAuthenticated) {
    return <Login />
  }

  const filters = [
    { label: "All", active: true },
    { label: "Upper Body" },
    { label: "Lower Body" },
    { label: "Cardio" },
    { label: "Strength" },
    { label: "HIT" }
  ]

  // Transform saved workouts to display format
  const displayWorkouts = workouts.map(workout => {
    const contentLines = workout.content.split('\n').filter((line: string) => line.trim())
    const exercises = workout.parsedData?.exercises || []
    const equipmentTags = workout.parsedData?.equipment || []
    
    return {
      id: workout.id,
      title: workout.title,
      date: new Date(workout.createdAt).toLocaleDateString(),
      steps: `${contentLines.length} steps`,
      exercises: `${exercises.length} exercises`,
      duration: "0 min", // Could be calculated from parsed data
      tags: equipmentTags.slice(0, 2), // Show first 2 equipment tags
      content: contentLines.slice(0, 3).map((line: string) => line.length > 50 ? line.substring(0, 50) + '...' : line)
    }
  })

  const summaryStats = [
    {
      icon: Dumbbell,
      value: workouts.length.toString(),
      label: "Total Workouts",
      color: "text-primary"
    },
    {
      icon: Clock, 
      value: workouts.reduce((total, w) => total + (w.parsedData?.exercises?.length || 0), 0).toString(),
      label: "Total Exercises",
      color: "text-secondary"
    },
    {
      icon: Clock,
      value: "0 min",
      label: "Total Time", 
      color: "text-rest"
    }
  ]

  return (
    <>
      <Header />
      <main className="min-h-screen pb-20 md:pb-8 flex justify-center">
        <div className="w-full max-w-6xl mx-auto px-4 py-8">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold text-text-primary mb-2">
                Workout Library
              </h1>
              <p className="text-text-secondary">
                Your saved workouts and routines
              </p>
            </div>
            <div className="flex gap-2">
              <Link href="/add">
                <Button className="flex items-center space-x-2">
                  <Plus className="h-4 w-4" />
                  <span>Add Workout</span>
                </Button>
              </Link>
              <div className="relative">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  disabled={isProcessingImage}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  id="image-upload"
                />
                <Button 
                  variant="outline" 
                  className="flex items-center space-x-2"
                  disabled={isProcessingImage}
                >
                  {isProcessingImage ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Camera className="h-4 w-4" />
                  )}
                  <span>{isProcessingImage ? 'Processing...' : 'Scan Image'}</span>
                </Button>
              </div>
            </div>
          </div>

          {/* Search and Filter Bar */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-text-secondary" />
              <Input 
                placeholder="Search workouts..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button variant="outline" className="flex items-center space-x-2">
              <Filter className="h-4 w-4" />
              <span>Filter</span>
            </Button>
          </div>

          {/* Filter Tags */}
          <div className="flex flex-wrap gap-2 mb-8">
            {filters.map((filter, index) => (
              <Button
                key={filter.label}
                variant={activeFilter === filter.label ? "default" : "outline"}
                size="sm"
                onClick={() => setActiveFilter(filter.label)}
                className={`rounded-full ${
                  activeFilter === filter.label 
                    ? 'bg-primary text-primary-foreground' 
                    : 'text-text-secondary hover:text-text-primary'
                }`}
              >
                {filter.label}
              </Button>
            ))}
          </div>

          {/* OCR Result Modal */}
          {showOCRResult && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                <div className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-2xl font-bold">OCR Results</h2>
                    <Button variant="ghost" onClick={() => setShowOCRResult(null)}>
                      ×
                    </Button>
                  </div>
                  
                  <div className="space-y-4">
                    {/* Workout Info */}
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <h3 className="font-semibold mb-2">Workout Details</h3>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="font-medium">Title:</span> {showOCRResult.title || 'Untitled'}
                        </div>
                        <div>
                          <span className="font-medium">Style:</span> {showOCRResult.style || 'Unknown'}
                        </div>
                        {showOCRResult.duration_min && (
                          <div>
                            <span className="font-medium">Duration:</span> {showOCRResult.duration_min} min
                          </div>
                        )}
                        {showOCRResult.rounds && (
                          <div>
                            <span className="font-medium">Rounds:</span> {showOCRResult.rounds}
                          </div>
                        )}
                        <div>
                          <span className="font-medium">OCR Engine:</span> {showOCRResult.ocr.engine}
                        </div>
                        {showOCRResult.ocr.confidence && (
                          <div>
                            <span className="font-medium">Confidence:</span> {showOCRResult.ocr.confidence}%
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Exercises */}
                    {showOCRResult.sections.map((section: any, sectionIndex: number) => (
                      <div key={sectionIndex} className="bg-gray-50 p-4 rounded-lg">
                        {section.label && (
                          <h4 className="font-semibold mb-2">{section.label}</h4>
                        )}
                        <div className="space-y-2">
                          {section.exercises.map((exercise: any, exerciseIndex: number) => (
                            <div key={exerciseIndex} className="bg-white p-3 rounded border text-sm">
                              <div className="font-medium">{exercise.name}</div>
                              <div className="text-gray-600 mt-1">
                                {exercise.sets && exercise.reps && (
                                  <span>{exercise.sets}x{exercise.reps} • </span>
                                )}
                                {exercise.distance_m && (
                                  <span>{exercise.distance_m}m • </span>
                                )}
                                {exercise.weight_kg && (
                                  <span>{exercise.weight_kg}kg • </span>
                                )}
                                {exercise.calories && (
                                  <span>{exercise.calories} cal • </span>
                                )}
                                {exercise.time_sec && (
                                  <span>{Math.floor(exercise.time_sec / 60)}:{(exercise.time_sec % 60).toString().padStart(2, '0')}</span>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}

                    {/* Raw Text */}
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <h4 className="font-semibold mb-2">Raw OCR Text</h4>
                      <pre className="text-sm whitespace-pre-wrap text-gray-600">
                        {showOCRResult.rawText}
                      </pre>
                    </div>

                    {/* Warnings */}
                    {showOCRResult.warnings.length > 0 && (
                      <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
                        <h4 className="font-semibold mb-2">Warnings</h4>
                        <ul className="list-disc list-inside text-sm">
                          {showOCRResult.warnings.map((warning: string, index: number) => (
                            <li key={index}>{warning}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex gap-2 pt-4">
                      <Button onClick={handleSaveOCRWorkout} className="flex-1">
                        Save Workout
                      </Button>
                      <Button variant="outline" onClick={() => setShowOCRResult(null)} className="flex-1">
                        Cancel
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Workout Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            {displayWorkouts.length === 0 ? (
              <div className="col-span-full text-center py-12">
                <Dumbbell className="h-12 w-12 text-text-secondary mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-text-primary mb-2">No workouts yet</h3>
                <p className="text-text-secondary mb-4">Import your first workout to get started</p>
                <Link href="/add">
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Workout
                  </Button>
                </Link>
              </div>
            ) : (
              displayWorkouts.map((workout) => (
              <Card key={workout.id} className="group hover:shadow-lg transition-all duration-200">
                <CardContent className="p-6">
                  {/* Workout Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="font-semibold text-text-primary mb-1 line-clamp-1">
                        {workout.title}
                      </h3>
                      <p className="text-sm text-text-secondary">
                        {workout.date} · {workout.steps}
                      </p>
                    </div>
                    <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100 transition-opacity">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </div>

                  {/* Workout Stats */}
                  <div className="flex items-center gap-4 text-sm text-text-secondary mb-4">
                    <span>{workout.exercises}</span>
                    <span>•</span>
                    <span>{workout.duration}</span>
                  </div>

                  {/* Tags */}
                  {workout.tags.length > 0 && (
                    <div className="flex gap-2 mb-4">
                      {workout.tags.map((tag: string, index: number) => (
                        <span 
                          key={index}
                          className="px-2 py-1 bg-primary/10 text-primary text-xs rounded-md"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Workout Preview */}
                  <div className="space-y-1 mb-6">
                    {workout.content.map((line: string, index: number) => (
                      <p key={index} className="text-sm text-text-secondary line-clamp-1">
                        {index + 1}. {line}
                      </p>
                    ))}
                  </div>

                  {/* Action Buttons */}
                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <Link href={`/workout/${workout.id}`}>
                        <Button variant="outline" size="sm" className="flex-1">
                          View Details
                        </Button>
                      </Link>
                      <Button size="sm" disabled className="flex-1 flex items-center space-x-2 opacity-60">
                        <Play className="h-3 w-3" />
                        <span>Coming Soon</span>
                      </Button>
                    </div>
                    
                    {/* Mark Completed Section */}
                    {showDatePicker === workout.id ? (
                      <div className="space-y-2">
                        <input
                          type="date"
                          value={selectedDate}
                          onChange={(e) => setSelectedDate(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                        />
                        <div className="flex gap-2">
                          <Button 
                            size="sm" 
                            onClick={() => handleMarkCompleted(workout.id)}
                            className="flex-1"
                          >
                            Confirm
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => setShowDatePicker(null)}
                            className="flex-1"
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => setShowDatePicker(workout.id)}
                        className="w-full flex items-center space-x-2"
                      >
                        <CheckCircle className="h-3 w-3" />
                        <span>Mark Completed</span>
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
              ))
            )}
          </div>

          {/* Bottom Stats Summary */}
          <div className="grid grid-cols-3 gap-6">
            {summaryStats.map((stat, index) => {
              const Icon = stat.icon
              return (
                <div key={index} className="text-center">
                  <Icon className={`h-8 w-8 ${stat.color} mx-auto mb-2`} />
                  <div className="text-2xl font-bold text-text-primary">{stat.value}</div>
                  <div className="text-sm text-text-secondary">{stat.label}</div>
                </div>
              )
            })}
          </div>
        </div>
      </main>
      <MobileNav />
    </>
  )
}