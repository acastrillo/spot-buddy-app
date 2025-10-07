import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { dynamoDBWorkouts } from "@/lib/dynamodb";

/**
 * PATCH /api/workouts/[id]/schedule
 * Schedule a workout for a specific date
 */
export async function PATCH(
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
    const body = await req.json();
    const { scheduledDate, status } = body;

    if (!scheduledDate) {
      return NextResponse.json(
        { error: "scheduledDate is required" },
        { status: 400 }
      );
    }

    // Validate date format (YYYY-MM-DD)
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(scheduledDate)) {
      return NextResponse.json(
        { error: "scheduledDate must be in YYYY-MM-DD format" },
        { status: 400 }
      );
    }

    // Schedule the workout
    await dynamoDBWorkouts.scheduleWorkout(
      userId,
      id,
      scheduledDate,
      status || 'scheduled'
    );

    return NextResponse.json({
      success: true,
      workoutId: id,
      scheduledDate,
      status: status || 'scheduled',
    });
  } catch (error) {
    console.error("Error scheduling workout:", error);
    return NextResponse.json(
      { error: "Failed to schedule workout" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/workouts/[id]/schedule
 * Unschedule a workout (remove scheduling info)
 */
export async function DELETE(
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

    // Unschedule the workout
    await dynamoDBWorkouts.unscheduleWorkout(userId, id);

    return NextResponse.json({
      success: true,
      workoutId: id,
    });
  } catch (error) {
    console.error("Error unscheduling workout:", error);
    return NextResponse.json(
      { error: "Failed to unschedule workout" },
      { status: 500 }
    );
  }
}
