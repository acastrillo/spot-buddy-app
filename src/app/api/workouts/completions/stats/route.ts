import { NextResponse } from "next/server";
import { getAuthenticatedUserId } from "@/lib/api-auth";
import { dynamoDBWorkoutCompletions } from "@/lib/dynamodb";

/**
 * GET /api/workouts/completions/stats
 * Get workout completion statistics for the authenticated user
 * Returns: thisWeek, total, streak, hoursTrained
 */
export async function GET() {
  try {
    const auth = await getAuthenticatedUserId();
    if ('error' in auth) return auth.error;
    const { userId } = auth;

    // Get stats from DynamoDB
    const stats = await dynamoDBWorkoutCompletions.getStats(userId);

    return NextResponse.json({ stats });
  } catch (error) {
    console.error("Error fetching workout stats:", error);
    return NextResponse.json(
      { error: "Failed to fetch workout stats" },
      { status: 500 }
    );
  }
}
