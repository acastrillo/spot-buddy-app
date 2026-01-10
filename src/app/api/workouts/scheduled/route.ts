import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUserId } from "@/lib/api-auth";
import { dynamoDBWorkouts } from "@/lib/dynamodb";

/**
 * GET /api/workouts/scheduled
 * Get all scheduled workouts for the authenticated user
 * Query params:
 *   - date: (optional) ISO date string (YYYY-MM-DD) to get workouts scheduled for specific date
 */
export async function GET(req: NextRequest) {
  try {
    const auth = await getAuthenticatedUserId();
    if ('error' in auth) return auth.error;
    const { userId } = auth;
    const { searchParams } = new URL(req.url);
    const date = searchParams.get("date");

    let workouts;
    if (date) {
      // Get workouts scheduled for a specific date
      workouts = await dynamoDBWorkouts.getScheduledForDate(userId, date);
    } else {
      // Get all scheduled workouts
      workouts = await dynamoDBWorkouts.getScheduled(userId);
    }

    return NextResponse.json(workouts);
  } catch (error) {
    console.error("Error fetching scheduled workouts:", error);
    return NextResponse.json(
      { error: "Failed to fetch scheduled workouts" },
      { status: 500 }
    );
  }
}
