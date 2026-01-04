import { NextRequest, NextResponse } from "next/server"
import { getAuthenticatedUserId } from "@/lib/api-auth"
import { dynamoDBWorkouts } from "@/lib/dynamodb"
import { calculateWorkoutStats } from "@/lib/workout-stats"
import { createRequestLogger } from "@/lib/logger"
import { AppMetrics, PerformanceMonitor } from "@/lib/metrics"

export async function GET(request: NextRequest) {
  const reqLogger = createRequestLogger(request)

  try {
    // SECURITY FIX: Use new auth utility
    const auth = await getAuthenticatedUserId();
    if ('error' in auth) {
      reqLogger.finish(401)
      AppMetrics.apiRequest("GET", "/api/workouts/stats", 401)
      return auth.error;
    }
    const { userId } = auth;

    reqLogger.log("Fetching workout stats", { userId })

    const perf = new PerformanceMonitor("api.workouts.stats", { userId })

    // PERFORMANCE FIX: Limit to last 200 workouts to prevent overfetching on mobile
    // Stats calculations only need recent data (last 12 months shown in charts)
    const workouts = await dynamoDBWorkouts.list(userId, 200)
    const stats = calculateWorkoutStats(workouts)
    const duration = perf.finish()

    reqLogger.log("Workout stats calculated", {
      userId,
      workoutCount: workouts.length,
      duration,
    })

    reqLogger.finish(200)
    AppMetrics.apiRequest("GET", "/api/workouts/stats", 200)

    // PERFORMANCE FIX: Add HTTP caching for mobile performance
    // Stats don't change frequently, cache for 5 minutes
    return NextResponse.json({ stats }, {
      headers: {
        'Cache-Control': 'private, max-age=300, stale-while-revalidate=60'
      }
    })
  } catch (error) {
    reqLogger.error("Error fetching workout stats", error as Error)
    reqLogger.finish(500)
    AppMetrics.apiError("GET", "/api/workouts/stats", "InternalServerError")
    AppMetrics.error("DatabaseError", "workouts.stats")

    return NextResponse.json({ error: "Failed to fetch workout stats" }, { status: 500 })
  }
}
