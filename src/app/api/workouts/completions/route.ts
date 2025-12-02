import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUserId } from "@/lib/api-auth";
import { dynamoDBWorkoutCompletions } from "@/lib/dynamodb";

/**
 * GET /api/workouts/completions
 * List all workout completions for the authenticated user
 */
export async function GET(req: NextRequest) {
  try {
    const auth = await getAuthenticatedUserId();
    if ('error' in auth) return auth.error;
    const { userId } = auth;

    // Parse query parameters
    const { searchParams } = new URL(req.url);
    const limit = searchParams.get("limit") ? parseInt(searchParams.get("limit")!) : undefined;
    const workoutId = searchParams.get("workoutId");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    let completions;

    // Query based on filters
    if (workoutId) {
      completions = await dynamoDBWorkoutCompletions.getForWorkout(userId, workoutId);
    } else if (startDate && endDate) {
      completions = await dynamoDBWorkoutCompletions.getByDateRange(userId, startDate, endDate);
    } else {
      completions = await dynamoDBWorkoutCompletions.list(userId, limit);
    }

    return NextResponse.json({ completions });
  } catch (error) {
    console.error("Error fetching workout completions:", error);
    return NextResponse.json(
      { error: "Failed to fetch workout completions" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/workouts/completions
 * Create a new workout completion record
 */
export async function POST(req: NextRequest) {
  try {
    const auth = await getAuthenticatedUserId();
    if ('error' in auth) return auth.error;
    const { userId } = auth;

    // Parse request body
    const body = await req.json();
    const { workoutId, completedAt, completedDate, durationSeconds, durationMinutes, notes } = body;

    // Validate required fields
    if (!workoutId || !completedAt || !completedDate) {
      return NextResponse.json(
        { error: "Missing required fields: workoutId, completedAt, completedDate" },
        { status: 400 }
      );
    }

    // Generate completion ID (timestamp-based for sorting)
    const completionId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Create the completion record
    const completion = await dynamoDBWorkoutCompletions.create(userId, {
      completionId,
      workoutId,
      completedAt,
      completedDate,
      durationSeconds,
      durationMinutes,
      notes,
    });

    return NextResponse.json({
      success: true,
      completion,
    });
  } catch (error) {
    console.error("Error creating workout completion:", error);
    return NextResponse.json(
      { error: "Failed to create workout completion" },
      { status: 500 }
    );
  }
}
