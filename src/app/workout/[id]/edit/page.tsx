"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { useAuthStore } from "@/store"
import { Login } from "@/components/auth/login"
import { Header } from "@/components/layout/header"
import { MobileNav } from "@/components/layout/mobile-nav"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { 
  Save,
  ArrowLeft,
  Trash2,
  AlertTriangle
} from "lucide-react"

interface Workout {
  id: string
  title: string
  content: string
  parsedData: any
  author: any
  createdAt: string
  source: string
  type: string
}

export default function EditWorkoutPage() {
  const { isAuthenticated } = useAuthStore()
  const params = useParams()
  const router = useRouter()
  const [workout, setWorkout] = useState<Workout | null>(null)
  const [title, setTitle] = useState("")
  const [content, setContent] = useState("")
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!params.id) return

    // Load workout from localStorage
    const savedWorkouts = JSON.parse(localStorage.getItem('workouts') || '[]')
    const foundWorkout = savedWorkouts.find((w: Workout) => w.id === params.id)
    
    if (foundWorkout) {
      setWorkout(foundWorkout)
      setTitle(foundWorkout.title)
      setContent(foundWorkout.content)
    } else {
      // Workout not found, redirect to library
      router.push('/library')
    }
    setLoading(false)
  }, [params.id, router])

  const handleSave = async () => {
    if (!workout || !title.trim() || !content.trim()) return

    setSaving(true)
    try {
      // Get existing workouts
      const savedWorkouts = JSON.parse(localStorage.getItem('workouts') || '[]')
      
      // Find and update the workout
      const updatedWorkouts = savedWorkouts.map((w: Workout) => {
        if (w.id === workout.id) {
          return {
            ...w,
            title: title.trim(),
            content: content.trim(),
            // Keep original parsed data for now - could re-parse if needed
            updatedAt: new Date().toISOString()
          }
        }
        return w
      })

      // Save back to localStorage
      localStorage.setItem('workouts', JSON.stringify(updatedWorkouts))

      // Redirect back to workout detail
      router.push(`/workout/${workout.id}`)
      
    } catch (error) {
      console.error('Save error:', error)
      alert('Failed to save workout')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!workout) return
    
    const confirmDelete = confirm('Are you sure you want to delete this workout? This action cannot be undone.')
    if (!confirmDelete) return

    try {
      // Get existing workouts
      const savedWorkouts = JSON.parse(localStorage.getItem('workouts') || '[]')
      
      // Remove the workout
      const filteredWorkouts = savedWorkouts.filter((w: Workout) => w.id !== workout.id)
      
      // Save back to localStorage
      localStorage.setItem('workouts', JSON.stringify(filteredWorkouts))

      // Redirect to library
      router.push('/library')
      
    } catch (error) {
      console.error('Delete error:', error)
      alert('Failed to delete workout')
    }
  }

  if (!isAuthenticated) {
    return <Login />
  }

  if (loading) {
    return (
      <>
        <Header />
        <main className="min-h-screen pb-20 md:pb-8 flex justify-center">
          <div className="w-full max-w-4xl mx-auto px-4 py-8">
            <div className="animate-pulse">
              <div className="h-8 bg-gray-300 rounded mb-4"></div>
              <div className="h-64 bg-gray-300 rounded"></div>
            </div>
          </div>
        </main>
        <MobileNav />
      </>
    )
  }

  if (!workout) {
    return (
      <>
        <Header />
        <main className="min-h-screen pb-20 md:pb-8 flex justify-center">
          <div className="w-full max-w-4xl mx-auto px-4 py-8">
            <div className="text-center py-12">
              <h2 className="text-2xl font-bold text-text-primary mb-2">Workout not found</h2>
              <p className="text-text-secondary mb-4">The workout you're trying to edit doesn't exist.</p>
              <Link href="/library">
                <Button>
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Library
                </Button>
              </Link>
            </div>
          </div>
        </main>
        <MobileNav />
      </>
    )
  }

  return (
    <>
      <Header />
      <main className="min-h-screen pb-20 md:pb-8 flex justify-center">
        <div className="w-full max-w-4xl mx-auto px-4 py-8">
          {/* Back Button */}
          <Link href={`/workout/${workout.id}`} className="inline-flex items-center text-text-secondary hover:text-text-primary mb-6">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Workout
          </Link>

          {/* Page Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-text-primary mb-2">Edit Workout</h1>
            <p className="text-text-secondary">
              Make changes to your workout content and save when ready
            </p>
          </div>

          {/* Edit Form */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Workout Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Title */}
              <div>
                <label className="block text-sm font-medium text-text-primary mb-2">
                  Workout Title
                </label>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Enter workout title..."
                  className="w-full"
                />
              </div>

              {/* Content */}
              <div>
                <label className="block text-sm font-medium text-text-primary mb-2">
                  Workout Content
                </label>
                <Textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Enter workout content..."
                  className="w-full min-h-[300px]"
                />
                <p className="text-sm text-text-secondary mt-2">
                  {content.length}/5000 characters
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap gap-3 pt-4">
                <Button 
                  onClick={handleSave}
                  disabled={saving || !title.trim() || !content.trim()}
                  size="lg"
                  className="flex items-center space-x-2"
                >
                  <Save className="h-4 w-4" />
                  <span>{saving ? 'Saving...' : 'Save Changes'}</span>
                </Button>

                <Link href={`/workout/${workout.id}`}>
                  <Button variant="outline" size="lg">
                    Cancel
                  </Button>
                </Link>

                <Button 
                  onClick={handleDelete}
                  variant="outline"
                  size="lg"
                  className="flex items-center space-x-2 text-red-600 hover:text-red-700 hover:bg-red-50 ml-auto"
                >
                  <Trash2 className="h-4 w-4" />
                  <span>Delete Workout</span>
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Info Card */}
          <Card>
            <CardContent className="p-6">
              <div className="flex items-start space-x-3">
                <AlertTriangle className="h-5 w-5 text-yellow-500 mt-0.5 flex-shrink-0" />
                <div>
                  <h3 className="font-medium text-text-primary mb-1">Note about editing</h3>
                  <p className="text-sm text-text-secondary">
                    Changes to the workout content will not automatically re-parse the exercises. 
                    If you make significant changes to exercise format, consider re-importing the workout.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
      <MobileNav />
    </>
  )
}