import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUserId } from "@/lib/api-auth";
import { dynamoDBWorkoutCompletions } from "@/lib/dynamodb";

/**
 * GET /api/workouts/[id]/completions
 * Get all completion records for a specific workout
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getAuthenticatedUserId();
    if ('error' in auth) return auth.error;
    const { userId } = auth;

    const { id: workoutId } = await params;

    // Get all completions for this workout
    const completions = await dynamoDBWorkoutCompletions.getForWorkout(userId, workoutId);

    return NextResponse.json({
      workoutId,
      count: completions.length,
      completions,
    });
  } catch (error) {
    console.error("Error fetching workout completions:", error);
    return NextResponse.json(
      { error: "Failed to fetch workout completions" },
      { status: 500 }
    );
  }
}
