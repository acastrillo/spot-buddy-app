import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { dynamoDBWorkouts } from "@/lib/dynamodb";
import { logger, createRequestLogger } from "@/lib/logger";
import { AppMetrics, PerformanceMonitor } from "@/lib/metrics";

// GET /api/workouts - List all workouts for the current user
export async function GET(request: NextRequest) {
  const reqLogger = createRequestLogger(request);

  try {
    const session = await getServerSession(authOptions);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (!(session?.user as any)?.id) {
      reqLogger.finish(401);
      AppMetrics.apiRequest("GET", "/api/workouts", 401);
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const searchParams = request.nextUrl.searchParams;
    const limit = searchParams.get("limit");

    reqLogger.log("Fetching workouts", { userId, limit });

    const perf = new PerformanceMonitor("api.workouts.get", { userId });
    const workouts = await dynamoDBWorkouts.list(userId, limit ? parseInt(limit) : undefined);
    const duration = perf.finish();

    reqLogger.log("Workouts fetched successfully", {
      userId,
      count: workouts.length,
      duration,
    });

    reqLogger.finish(200);
    AppMetrics.apiRequest("GET", "/api/workouts", 200);

    return NextResponse.json({ workouts });
  } catch (error) {
    reqLogger.error("Error fetching workouts", error as Error);
    reqLogger.finish(500);
    AppMetrics.apiError("GET", "/api/workouts", "InternalServerError");
    AppMetrics.error("DatabaseError", "workouts.list");

    return NextResponse.json({ error: "Failed to fetch workouts" }, { status: 500 });
  }
}

// POST /api/workouts - Create a new workout
export async function POST(request: NextRequest) {
  const reqLogger = createRequestLogger(request);

  try {
    const session = await getServerSession(authOptions);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (!(session?.user as any)?.id) {
      reqLogger.finish(401);
      AppMetrics.apiRequest("POST", "/api/workouts", 401);
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const body = await request.json();
    const {
      workoutId,
      title,
      description,
      exercises,
      content,
      author,
      source,
      type,
      totalDuration,
      difficulty,
      tags,
      llmData,
    } = body;

    if (!workoutId || !title || !exercises || !content) {
      reqLogger.finish(400);
      AppMetrics.apiRequest("POST", "/api/workouts", 400);
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    reqLogger.log("Creating workout", { userId, workoutId, title });

    const perf = new PerformanceMonitor("api.workouts.post", { userId });
    const workout = await dynamoDBWorkouts.upsert(userId, {
      workoutId,
      title,
      description,
      exercises,
      content,
      author,
      source,
      type,
      totalDuration,
      difficulty,
      tags,
      llmData,
    });
    const duration = perf.finish();

    reqLogger.log("Workout created successfully", { userId, workoutId, duration });

    reqLogger.finish(201);
    AppMetrics.apiRequest("POST", "/api/workouts", 201);
    AppMetrics.workoutCreated(userId, source || "unknown");

    return NextResponse.json({ workout }, { status: 201 });
  } catch (error) {
    reqLogger.error("Error creating workout", error as Error);
    reqLogger.finish(500);
    AppMetrics.apiError("POST", "/api/workouts", "InternalServerError");
    AppMetrics.error("DatabaseError", "workouts.upsert");

    return NextResponse.json({ error: "Failed to create workout" }, { status: 500 });
  }
}
