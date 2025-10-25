"use client"

import { useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { useAuthStore } from "@/store"
import { Login } from "@/components/auth/login"
import { Header } from "@/components/layout/header"
import { MobileNav } from "@/components/layout/mobile-nav"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import {
  Link2,
  FileText,
  Upload,
  CheckCircle,
  Sparkles,
  Image as ImageIcon,
  X,
  Crown
} from "lucide-react"
import { LoadingSpinner } from "@/components/ui/loading-spinner"
import { getQuotaLimit } from "@/lib/stripe"
import { UpgradePrompt } from "@/components/subscription/upgrade-prompt"
import { WorkoutEnhancerButton } from "@/components/ai/workout-enhancer-button"
import Link from "next/link"

export default function ImportWorkoutPage() {
  const { isAuthenticated, user } = useAuthStore()
  const router = useRouter()
  const [activeTab, setActiveTab] = useState("url")
  const [url, setUrl] = useState("")
  const [workoutTitle, setWorkoutTitle] = useState("")
  const [workoutContent, setWorkoutContent] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [fetchedData, setFetchedData] = useState<any>(null)
  const [workoutData, setWorkoutData] = useState<any>(null)
  const [uploadedImage, setUploadedImage] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [isDragOver, setIsDragOver] = useState(false)
  const [isProcessingOCR, setIsProcessingOCR] = useState(false)
  const [ocrError, setOcrError] = useState<string | null>(null)

  if (!isAuthenticated) {
    return <Login />
  }

  const handleImageUpload = useCallback((file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('Please upload an image file')
      return
    }

    setUploadedImage(file)
    setOcrError(null)

    // Create preview
    const reader = new FileReader()
    reader.onloadend = () => {
      setImagePreview(reader.result as string)
    }
    reader.readAsDataURL(file)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)

    const file = e.dataTransfer.files[0]
    if (file) {
      handleImageUpload(file)
    }
  }, [handleImageUpload])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
  }, [])

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      handleImageUpload(file)
    }
  }, [handleImageUpload])

  const removeImage = () => {
    setUploadedImage(null)
    setImagePreview(null)
    setOcrError(null)
  }

  const processImageWithOCR = async () => {
    if (!uploadedImage) return

    setIsProcessingOCR(true)
    setOcrError(null)

    try {
      const formData = new FormData()
      formData.append('file', uploadedImage)

      const response = await fetch('/api/ocr', {
        method: 'POST',
        body: formData,
      })

      const data = await response.json()

      if (!response.ok) {
        if (response.status === 429) {
          setOcrError(`OCR quota exceeded. You've used ${data.quotaUsed}/${data.quotaLimit} credits. ${data.subscriptionTier === 'free' ? 'Upgrade to get more!' : ''}`)
          return
        }
        throw new Error(data.error || 'OCR processing failed')
      }

      // Set the extracted text as workout content
      setWorkoutContent(data.text)
      setWorkoutTitle('OCR Extracted Workout')
      setActiveTab('manual')

      // Update user quota in store (refresh session)
      if (user) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (user as any).ocrQuotaUsed = data.quotaUsed
      }

    } catch (error) {
      console.error('OCR processing error:', error)
      setOcrError(error instanceof Error ? error.message : 'Failed to process image')
    } finally {
      setIsProcessingOCR(false)
    }
  }

  const handleFetch = async () => {
    if (!url.trim()) return

    setIsLoading(true)
    
    try {
      // Step 1: Fetch from Instagram
      const fetchResponse = await fetch('/api/instagram-fetch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url: url.trim() }),
      })

      if (!fetchResponse.ok) {
        const error = await fetchResponse.json().catch(() => ({ error: `HTTP ${fetchResponse.status}: ${fetchResponse.statusText}` }))
        console.error('Fetch API Error:', error)
        throw new Error(error.error || `Failed to fetch workout (${fetchResponse.status})`)
      }

      const fetchData = await fetchResponse.json()
      setFetchedData(fetchData)
      setWorkoutContent(fetchData.content)
      
      // Step 2: Process caption into simple rows
      const processResponse = await fetch('/api/ingest', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          caption: fetchData.content,
          url: url.trim()
        }),
      })

      if (!processResponse.ok) {
        let errorMessage = `Failed to process workout (${processResponse.status})`
        try {
          const error = await processResponse.json()
          errorMessage = error.error || errorMessage
        } catch {
          errorMessage = `HTTP ${processResponse.status}: ${processResponse.statusText}`
        }
        console.error('Processing API Error:', errorMessage)
        throw new Error(errorMessage)
      }

      const workoutResult = await processResponse.json()
      setWorkoutData(workoutResult)
      setWorkoutTitle(fetchData.title || 'Imported Workout')
      
    } catch (error) {
      console.error('Process error:', error)
      alert(error instanceof Error ? error.message : 'Failed to process workout')
    } finally {
      setIsLoading(false)
    }
  }

  const handleParseWorkout = async () => {
    if (!workoutTitle || !workoutContent) return

    try {
      let workoutToEdit = workoutData

      // If we don't have processed data, process it now
      if (!workoutData && workoutContent) {
        const processResponse = await fetch('/api/ingest', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ 
            caption: workoutContent,
            url: activeTab === 'url' ? url : undefined
          }),
        })

        if (processResponse.ok) {
          workoutToEdit = await processResponse.json()
          setWorkoutData(workoutToEdit)
        }
      }

      // Store workout data in sessionStorage for the edit page
      const workoutForEdit = {
        id: Date.now().toString(),
        title: workoutTitle,
        content: workoutContent,
        llmData: workoutToEdit,
        author: fetchedData?.author || null,
        createdAt: new Date().toISOString(),
        source: activeTab === 'url' ? url : 'manual',
        type: activeTab
      }

      sessionStorage.setItem('workoutToEdit', JSON.stringify(workoutForEdit))
      
      // Navigate to edit page
      router.push('/add/edit')
      
    } catch (error) {
      console.error('Processing error:', error)
      alert('Failed to process workout')
    }
  }

  return (
    <>
      <Header />
      <main className="min-h-screen pb-20 md:pb-8 flex justify-center">
        <div className="w-full max-w-4xl mx-auto px-4 py-8">
          {/* Header */}
          <div className="mb-8 text-center">
            <h1 className="text-3xl font-bold text-text-primary mb-2">
              Import Workout
            </h1>
            <p className="text-text-secondary">
              Import from social media or enter text manually
            </p>
          </div>

          {/* Main Import Card */}
          <Card className="mb-8">
            <CardHeader className="pb-4">
              <div className="flex items-center space-x-2 text-text-primary">
                <Upload className="h-5 w-5" />
                <span className="font-semibold">Import Workout</span>
              </div>
              <p className="text-sm text-text-secondary">
                Choose how you'd like to import your workout
              </p>
            </CardHeader>
            <CardContent className="pt-0">
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="grid w-full grid-cols-3 mb-6">
                  <TabsTrigger value="url" className="flex items-center space-x-2">
                    <Link2 className="h-4 w-4" />
                    <span>URL/Social</span>
                  </TabsTrigger>
                  <TabsTrigger value="image" className="flex items-center space-x-2">
                    <ImageIcon className="h-4 w-4" />
                    <span>Image/OCR</span>
                  </TabsTrigger>
                  <TabsTrigger value="manual" className="flex items-center space-x-2">
                    <FileText className="h-4 w-4" />
                    <span>Manual</span>
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="url">
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-text-primary mb-2">
                        Source URL
                      </label>
                      <div className="flex space-x-2">
                        <Input
                          placeholder="https://www.instagram.com/p/..."
                          value={url}
                          onChange={(e) => setUrl(e.target.value)}
                          className="flex-1"
                        />
                        <Button 
                          onClick={handleFetch}
                          disabled={isLoading || !url.trim()}
                          className="min-w-[80px]"
                        >
                          {isLoading ? (
                            <LoadingSpinner size="sm" text="Processing" />
                          ) : (
                            "Fetch"
                          )}
                        </Button>
                      </div>
                      <p className="text-sm text-text-secondary mt-2">
                        Social media URL format: Paste URLs from Instagram, TikTok, or other platforms
                      </p>
                      
                      {fetchedData ? (
                        <div className="mt-4 p-4 bg-primary/10 border border-primary/20 rounded-lg">
                          <div className="flex items-start space-x-2 mb-3">
                            <CheckCircle className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                            <div className="text-sm">
                              <span className="text-primary font-medium">Workout fetched successfully!</span>
                              <span className="text-text-secondary"> From @{fetchedData.author?.username}</span>
                            </div>
                          </div>
                          
                          {workoutData && (
                            <div className="mb-3 p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
                              <div className="flex items-center space-x-2 mb-2">
                                <CheckCircle className="h-4 w-4 text-green-500" />
                                <span className="text-sm text-green-500 font-medium">
                                  Caption processed successfully
                                </span>
                              </div>
                              
                              {workoutData.summary && (
                                <p className="text-sm text-text-secondary mb-2">
                                  {workoutData.summary}
                                </p>
                              )}
                              
                              {workoutData.breakdown && workoutData.breakdown.length > 0 && (
                                <div className="text-xs text-text-secondary space-y-1">
                                  {workoutData.breakdown.map((item: string, idx: number) => (
                                    <div key={idx}>• {item}</div>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}
                          
                          <div className="mt-3 p-3 bg-surface rounded-lg">
                            <div className="flex items-center justify-between mb-2">
                              <h4 className="text-sm font-medium text-text-primary">
                                Full Caption Content:
                              </h4>
                              <WorkoutEnhancerButton
                                rawText={fetchedData.content}
                                onEnhanced={(enhancedText) => {
                                  setWorkoutContent(enhancedText)
                                }}
                                size="sm"
                                variant="outline"
                              />
                            </div>
                            <div className="text-xs text-text-secondary whitespace-pre-wrap max-h-32 overflow-y-auto">
                              {fetchedData.content}
                            </div>
                            
                            {workoutData && workoutData.rows && workoutData.rows.length > 0 && (
                              <div className="mt-3 pt-3 border-t border-border">
                                <h4 className="text-sm font-medium text-text-primary mb-2">
                                  Detected {workoutData.rows.length} exercises:
                                </h4>
                                <div className="space-y-1 max-h-24 overflow-y-auto">
                                  {workoutData.rows.slice(0, 6).map((exercise: any, idx: number) => (
                                    <div key={idx} className="text-xs text-text-secondary">
                                      {exercise.movement}
                                      {exercise.reps && ` - ${exercise.reps} reps`}
                                      {exercise.sets > 1 && ` × ${exercise.sets} sets`}
                                      {exercise.weight && ` @ ${exercise.weight}`}
                                    </div>
                                  ))}
                                  {workoutData.rows.length > 6 && (
                                    <div className="text-xs text-text-secondary/70">
                                      +{workoutData.rows.length - 6} more exercises...
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div className="mt-3 p-3 bg-primary/10 border border-primary/20 rounded-lg">
                          <div className="flex items-start space-x-2">
                            <CheckCircle className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                            <div className="text-sm">
                              <span className="text-primary font-medium">Instagram import ready:</span>
                              <span className="text-text-secondary"> Click &quot;Fetch&quot; after entering an Instagram URL to automatically extract the workout content.</span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="image">
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-text-primary mb-2">
                        Upload Workout Screenshot
                      </label>

                      {/* Drag and Drop Zone */}
                      <div
                        onDrop={handleDrop}
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        className={`relative border-2 border-dashed rounded-lg p-8 transition-colors ${
                          isDragOver
                            ? 'border-primary bg-primary/10'
                            : 'border-border bg-surface hover:border-primary/50'
                        }`}
                      >
                        {imagePreview ? (
                          <div className="space-y-4">
                            <div className="relative">
                              <img
                                src={imagePreview}
                                alt="Workout preview"
                                className="max-h-64 mx-auto rounded-lg"
                              />
                              <Button
                                variant="destructive"
                                size="icon"
                                className="absolute top-2 right-2"
                                onClick={removeImage}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>

                            {ocrError && (
                              <div className="space-y-3">
                                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-sm text-red-500">
                                  {ocrError}
                                </div>
                                {ocrError.includes('quota exceeded') && (
                                  <UpgradePrompt
                                    compact
                                    reason="Upgrade to get more OCR scans per week"
                                    feature="unlimited OCR"
                                  />
                                )}
                              </div>
                            )}

                            {user && (() => {
                              const tier = (user as any).subscriptionTier || 'free'
                              const quotaLimit = getQuotaLimit(tier, 'ocrQuotaWeekly')
                              const quotaUsed = (user as any).ocrQuotaUsed || 0
                              const quotaRemaining = quotaLimit === null ? 'Unlimited' : `${quotaLimit - quotaUsed}/${quotaLimit}`
                              const isLow = quotaLimit !== null && (quotaLimit - quotaUsed) <= 1

                              return (
                                <div className="space-y-2">
                                  <div className={`text-sm text-center ${isLow ? 'text-amber-500 font-medium' : 'text-text-secondary'}`}>
                                    OCR Credits: {quotaRemaining} remaining this week
                                  </div>
                                  {isLow && tier === 'free' && (
                                    <div className="text-center">
                                      <Link href="/subscription">
                                        <Button variant="outline" size="sm" className="text-xs">
                                          <Crown className="h-3 w-3 mr-1" />
                                          Upgrade for More
                                        </Button>
                                      </Link>
                                    </div>
                                  )}
                                </div>
                              )
                            })()}

                            <Button
                              className="w-full"
                              onClick={processImageWithOCR}
                              disabled={isProcessingOCR}
                            >
                              {isProcessingOCR ? (
                                <LoadingSpinner size="sm" text="Processing OCR" />
                              ) : (
                                <>
                                  <Sparkles className="h-4 w-4 mr-2" />
                                  Extract Text with OCR
                                </>
                              )}
                            </Button>
                          </div>
                        ) : (
                          <div className="text-center">
                            <ImageIcon className="h-12 w-12 text-text-secondary mx-auto mb-4" />
                            <p className="text-text-primary font-medium mb-2">
                              Drag and drop your workout screenshot here
                            </p>
                            <p className="text-sm text-text-secondary mb-4">
                              or click to browse files
                            </p>
                            <input
                              type="file"
                              accept="image/*"
                              onChange={handleFileInput}
                              className="hidden"
                              id="image-upload"
                            />
                            <label htmlFor="image-upload">
                              <Button variant="outline" asChild>
                                <span>
                                  <Upload className="h-4 w-4 mr-2" />
                                  Choose File
                                </span>
                              </Button>
                            </label>
                          </div>
                        )}
                      </div>

                      <p className="text-sm text-text-secondary mt-2">
                        Upload a screenshot of your workout and we'll extract the text using OCR
                      </p>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="manual">
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-text-primary mb-2">
                        Workout Title
                      </label>
                      <Input
                        placeholder="e.g., Upper Body Strength, AMRAP 20"
                        value={workoutTitle}
                        onChange={(e) => setWorkoutTitle(e.target.value)}
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-text-primary mb-2">
                        Workout Content
                      </label>
                      <Textarea
                        placeholder="Your workout content will appear here..."
                        value={workoutContent}
                        onChange={(e) => setWorkoutContent(e.target.value)}
                        className="min-h-[200px]"
                      />
                      <div className="flex items-center justify-between mt-2">
                        <p className="text-sm text-text-secondary">
                          {workoutContent.length}/5000 characters
                        </p>
                        {workoutContent.trim() && (
                          <WorkoutEnhancerButton
                            rawText={workoutContent}
                            onEnhanced={(enhancedText) => {
                              setWorkoutContent(enhancedText)
                            }}
                            size="sm"
                            variant="outline"
                          />
                        )}
                      </div>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>

              <div className="flex justify-center mt-8">
                <Button 
                  size="lg" 
                  className="px-8"
                  onClick={handleParseWorkout}
                  disabled={!workoutTitle || !workoutContent}
                >
                  {workoutData ? (
                    <>
                      <Sparkles className="h-4 w-4 mr-2" />
                      Edit Workout
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4 mr-2" />
                      Create Workout
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* How It Works Section */}
          <Card>
            <CardHeader className="pb-4">
              <div className="flex items-center space-x-2 text-primary">
                <CheckCircle className="h-5 w-5" />
                <CardTitle className="text-lg">How It Works</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-3 gap-6">
                <div>
                  <h4 className="font-semibold text-text-primary mb-3">1. Import Content</h4>
                  <ul className="text-sm text-text-secondary space-y-2">
                    <li>• Instagram post URLs</li>
                    <li>• Manual text entry</li>
                    <li>• Copy & paste captions</li>
                    <li>• Any workout description</li>
                  </ul>
                </div>

                <div>
                  <h4 className="font-semibold text-text-primary mb-3">2. Edit Manually</h4>
                  <ul className="text-sm text-text-secondary space-y-2">
                    <li>• Each line becomes a row</li>
                    <li>• Edit exercise names</li>
                    <li>• Add sets, reps, weight</li>
                    <li>• Include rest times</li>
                  </ul>
                </div>

                <div>
                  <h4 className="font-semibold text-text-primary mb-3">3. Save & Track</h4>
                  <ul className="text-sm text-text-secondary space-y-2">
                    <li>• Custom workout names</li>
                    <li>• Add descriptions</li>
                    <li>• Save to your library</li>
                    <li>• Track your progress</li>
                  </ul>
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