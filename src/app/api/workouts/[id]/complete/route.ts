import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { dynamoDBWorkouts } from "@/lib/dynamodb";

/**
 * POST /api/workouts/[id]/complete
 * Mark a workout as completed
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const userId = (session.user as any).id;

    // Parse request body
    const body = await req.json().catch(() => ({}));
    const { completedDate } = body;

    // Mark the workout as completed
    await dynamoDBWorkouts.completeWorkout(userId, id, completedDate);

    return NextResponse.json({
      success: true,
      workoutId: id,
      completedDate: completedDate || new Date().toISOString().split("T")[0],
      status: 'completed',
    });
  } catch (error) {
    console.error("Error completing workout:", error);
    return NextResponse.json(
      { error: "Failed to complete workout" },
      { status: 500 }
    );
  }
}
