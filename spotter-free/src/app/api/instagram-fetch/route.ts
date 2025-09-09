import { NextRequest, NextResponse } from 'next/server'

interface ApifyInstagramResult {
  url?: string
  caption?: string
  displayUrl?: string
  timestamp?: string
  likesCount?: number
  commentsCount?: number
  ownerUsername?: string
  ownerFullName?: string
  text?: string
  // Additional possible fields
  id?: string
  shortcode?: string
  videoUrl?: string
  alt?: string
}

interface InstagramFetchRequest {
  url: string
}

export async function POST(request: NextRequest) {
  try {
    const { url }: InstagramFetchRequest = await request.json()

    if (!url) {
      return NextResponse.json(
        { error: 'Instagram URL is required' },
        { status: 400 }
      )
    }

    // Validate Instagram URL format
    const instagramUrlPattern = /^https?:\/\/(www\.)?(instagram\.com|instagr\.am)\/(p|reel)\/[\w-]+\/?/
    if (!instagramUrlPattern.test(url)) {
      return NextResponse.json(
        { error: 'Invalid Instagram URL format' },
        { status: 400 }
      )
    }

    const apifyApiToken = process.env.APIFY_API_TOKEN
    if (!apifyApiToken) {
      console.error('APIFY_API_TOKEN is not configured')
      return NextResponse.json(
        { error: 'API configuration error' },
        { status: 500 }
      )
    }

    // Fetching Instagram URL
    
    try {
      // Call Apify Instagram scraper - start the run
      const apifyResponse = await fetch('https://api.apify.com/v2/acts/shu8hvrXbJbY3Eb9W/runs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apifyApiToken}`,
        },
        body: JSON.stringify({
          directUrls: [url],
          resultsLimit: 1,
          resultsType: "posts",
          addParentData: false,
          enhanceUserSearchWithFacebookPage: false,
          isUserReelFeedURL: false,
          isUserTaggedFeedURL: false,
          searchLimit: 1,
        }),
      })


      if (!apifyResponse.ok) {
        const errorText = await apifyResponse.text()
        console.error('Apify API error:', apifyResponse.status, errorText)
        return NextResponse.json(
          { 
            error: `Failed to start Instagram scraper: ${apifyResponse.status}`,
            details: errorText 
          },
          { status: apifyResponse.status }
        )
      }

      const runResponse = await apifyResponse.json()
      
      if (!runResponse || !runResponse.data || !runResponse.data.id) {
        console.error('No run ID in response:', runResponse)
        return NextResponse.json(
          { error: 'Failed to start Instagram scraper - no run ID returned' },
          { status: 500 }
        )
      }
      
      const runData = runResponse.data

      // Wait for the run to complete (poll the status)
      let attempts = 0
      const maxAttempts = 60 // 60 seconds max wait for Instagram scraping
      
      while (attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 1000)) // Wait 1 second
        
        const statusResponse = await fetch(`https://api.apify.com/v2/actor-runs/${runData.id}`, {
          headers: {
            'Authorization': `Bearer ${apifyApiToken}`,
          },
        })

        if (!statusResponse.ok) {
          console.error('Status check failed:', statusResponse.status)
          attempts++
          continue
        }

        const statusResponse_ = await statusResponse.json()
        const statusData = statusResponse_.data || statusResponse_
        
        if (!statusData || !statusData.status) {
          console.error('Invalid status response:', statusResponse_)
          attempts++
          continue
        }
        
        if (statusData.status === 'SUCCEEDED') {
          
          // Get the dataset results
          const datasetResponse = await fetch(
            `https://api.apify.com/v2/datasets/${statusData.defaultDatasetId}/items`,
            {
              headers: {
                'Authorization': `Bearer ${apifyApiToken}`,
              },
            }
          )

          if (!datasetResponse.ok) {
            const errorText = await datasetResponse.text()
            console.error('Dataset fetch error:', errorText)
            return NextResponse.json(
              { error: `Failed to fetch dataset: ${errorText}` },
              { status: datasetResponse.status }
            )
          }

          const results: ApifyInstagramResult[] = await datasetResponse.json()
          
          if (!results || results.length === 0) {
            return NextResponse.json(
              { error: 'No Instagram post found' },
              { status: 404 }
            )
          }

          // Process the results
          const post = results[0]
          
          const caption = post.caption || post.text || ''
          const postUrl = post.url || url
          const timestamp = post.timestamp || new Date().toISOString()
          
          const workoutData = {
            url: postUrl,
            title: `Instagram Workout - ${new Date(timestamp).toLocaleDateString()}`,
            content: caption,
            author: {
              username: post.ownerUsername || 'unknown',
              fullName: post.ownerFullName || 'Unknown User',
            },
            stats: {
              likes: post.likesCount || 0,
              comments: post.commentsCount || 0,
            },
            image: post.displayUrl || '',
            timestamp: timestamp,
            parsedWorkout: parseWorkoutFromCaption(caption),
          }

          return NextResponse.json(workoutData)
          
        } else if (statusData.status === 'FAILED') {
          console.error('Run failed:', statusData.statusMessage)
          return NextResponse.json(
            { error: `Instagram scraper failed: ${statusData.statusMessage}` },
            { status: 500 }
          )
        } else if (statusData.status === 'ABORTED') {
          return NextResponse.json(
            { error: 'Instagram scraper was aborted' },
            { status: 500 }
          )
        }
        
        attempts++
      }

      // If we get here, the run didn't complete in time
      return NextResponse.json(
        { error: 'Instagram scraper timed out. Try again in a moment.' },
        { status: 408 }
      )
      
    } catch (parseError) {
      console.error('JSON Parse error:', parseError)
      return NextResponse.json(
        { error: 'Failed to parse API response' },
        { status: 500 }
      )
    }


  } catch (error) {
    console.error('Instagram fetch error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

function parseWorkoutFromCaption(caption: string) {
  // Basic workout parsing logic
  const lines = caption.split('\n').filter(line => line.trim())
  const exercises: Array<{ name: string; sets?: string; reps?: string; weight?: string; time?: string }> = []
  let workoutInstructions = ''
  
  // Look for common workout patterns
  lines.forEach(line => {
    const trimmedLine = line.trim()
    
    // Pattern: Emoji numbered exercises like "1️⃣ DUMBBELL HOPS" or "2️⃣ SINGLE ARM OH LUNGE"
    const emojiNumberMatch = trimmedLine.match(/^[0-9]️⃣\s+(.+)$/i)
    if (emojiNumberMatch) {
      exercises.push({
        name: emojiNumberMatch[1].trim(),
      })
      return
    }

    // Pattern: "Exercise: 3x10" or "Exercise - 3 sets x 10 reps"
    const setRepMatch = trimmedLine.match(/(.+?)[-:]?\s*(\d+)\s*x\s*(\d+)/i)
    if (setRepMatch) {
      exercises.push({
        name: setRepMatch[1].trim().replace(/^\d+\.\s*/, ''), // Remove number prefix
        sets: setRepMatch[2],
        reps: setRepMatch[3],
      })
      return
    }

    // Pattern: "Exercise: 30 seconds" or "Exercise - 2 minutes"
    const timeMatch = trimmedLine.match(/(.+?)[-:]?\s*(\d+)\s*(sec|second|min|minute)s?/i)
    if (timeMatch) {
      exercises.push({
        name: timeMatch[1].trim().replace(/^\d+\.\s*/, ''),
        time: `${timeMatch[2]} ${timeMatch[3]}`,
      })
      return
    }

    // Pattern: "Exercise with weight: 50lbs" or "Exercise @ 25kg"
    const weightMatch = trimmedLine.match(/(.+?)[@:\-]?\s*(\d+)\s*(lbs?|kg|pounds?)/i)
    if (weightMatch) {
      exercises.push({
        name: weightMatch[1].trim().replace(/^\d+\.\s*/, ''),
        weight: `${weightMatch[2]}${weightMatch[3]}`,
      })
      return
    }

    // Look for workout instructions (time/rest patterns)
    if (trimmedLine.match(/✅.*\d+\s*(sec|second|min|minute)s?/i) ||
        trimmedLine.match(/work.*rest/i) ||
        trimmedLine.match(/\d+\s*sets?/i)) {
      workoutInstructions += (workoutInstructions ? ' | ' : '') + trimmedLine
      return
    }

    // Simple exercise name (if it looks like an exercise)
    if (trimmedLine.match(/^\d+\.\s*/) || 
        trimmedLine.toLowerCase().includes('squat') ||
        trimmedLine.toLowerCase().includes('push') ||
        trimmedLine.toLowerCase().includes('pull') ||
        trimmedLine.toLowerCase().includes('press') ||
        trimmedLine.toLowerCase().includes('curl') ||
        trimmedLine.toLowerCase().includes('row') ||
        trimmedLine.toLowerCase().includes('lunge') ||
        trimmedLine.toLowerCase().includes('burpee') ||
        trimmedLine.toLowerCase().includes('hop') ||
        trimmedLine.toLowerCase().includes('drag')) {
      exercises.push({
        name: trimmedLine.trim().replace(/^\d+\.\s*/, ''),
      })
    }
  })

  return {
    exercises,
    rawText: caption,
    totalExercises: exercises.length,
    workoutInstructions: workoutInstructions || undefined,
  }
}