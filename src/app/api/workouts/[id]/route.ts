import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUserId } from "@/lib/api-auth";
import { dynamoDBWorkouts } from "@/lib/dynamodb";

// GET /api/workouts/[id] - Get a specific workout
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getAuthenticatedUserId();
    if ('error' in auth) return auth.error;
    const { userId } = auth;

    const { id } = await params;
    const workout = await dynamoDBWorkouts.get(userId, id);

    if (!workout) {
      return NextResponse.json({ error: "Workout not found" }, { status: 404 });
    }

    return NextResponse.json({ workout });
  } catch (error) {
    console.error("Error fetching workout:", error);
    return NextResponse.json(
      { error: "Failed to fetch workout" },
      { status: 500 }
    );
  }
}

// PATCH /api/workouts/[id] - Update a workout
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getAuthenticatedUserId();
    if ('error' in auth) return auth.error;
    const { userId } = auth;

    const { id } = await params;
    const body = await request.json();
    const { title, description, exercises, totalDuration, difficulty, tags } =
      body;

    await dynamoDBWorkouts.update(userId, id, {
      title,
      description,
      exercises,
      totalDuration,
      difficulty,
      tags,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating workout:", error);
    return NextResponse.json(
      { error: "Failed to update workout" },
      { status: 500 }
    );
  }
}

// DELETE /api/workouts/[id] - Delete a workout
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getAuthenticatedUserId();
    if ('error' in auth) return auth.error;
    const { userId } = auth;

    const { id } = await params;
    await dynamoDBWorkouts.delete(userId, id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting workout:", error);
    return NextResponse.json(
      { error: "Failed to delete workout" },
      { status: 500 }
    );
  }
}
