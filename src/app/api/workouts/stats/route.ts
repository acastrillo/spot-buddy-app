import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"

import { authOptions } from "@/lib/auth-options"
import { dynamoDBWorkouts } from "@/lib/dynamodb"
import { calculateWorkoutStats } from "@/lib/workout-stats"
import { createRequestLogger } from "@/lib/logger"
import { AppMetrics, PerformanceMonitor } from "@/lib/metrics"

export async function GET(request: NextRequest) {
  const reqLogger = createRequestLogger(request)

  try {
    const session = await getServerSession(authOptions)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const userId = (session?.user as any)?.id

    if (!userId) {
      reqLogger.finish(401)
      AppMetrics.apiRequest("GET", "/api/workouts/stats", 401)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    reqLogger.log("Fetching workout stats", { userId })

    const perf = new PerformanceMonitor("api.workouts.stats", { userId })
    const workouts = await dynamoDBWorkouts.list(userId)
    const stats = calculateWorkoutStats(workouts)
    const duration = perf.finish()

    reqLogger.log("Workout stats calculated", {
      userId,
      workoutCount: workouts.length,
      duration,
    })

    reqLogger.finish(200)
    AppMetrics.apiRequest("GET", "/api/workouts/stats", 200)

    return NextResponse.json({ stats })
  } catch (error) {
    reqLogger.error("Error fetching workout stats", error as Error)
    reqLogger.finish(500)
    AppMetrics.apiError("GET", "/api/workouts/stats", "InternalServerError")
    AppMetrics.error("DatabaseError", "workouts.stats")

    return NextResponse.json({ error: "Failed to fetch workout stats" }, { status: 500 })
  }
}
