import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { dynamoDBWorkouts } from "@/lib/dynamodb";

/**
 * GET /api/workouts/scheduled
 * Get all scheduled workouts for the authenticated user
 * Query params:
 *   - date: (optional) ISO date string (YYYY-MM-DD) to get workouts scheduled for specific date
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session.user as any).id;
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
