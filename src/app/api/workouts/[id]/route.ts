import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { dynamoDBWorkouts } from "@/lib/dynamodb";

// GET /api/workouts/[id] - Get a specific workout
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (!(session?.user as any)?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const workout = await dynamoDBWorkouts.get((session.user as any).id, id);

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
    const session = await getServerSession(authOptions);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (!(session?.user as any)?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { title, description, exercises, totalDuration, difficulty, tags } =
      body;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await dynamoDBWorkouts.update((session.user as any).id, id, {
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
    const session = await getServerSession(authOptions);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (!(session?.user as any)?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await dynamoDBWorkouts.delete((session.user as any).id, id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting workout:", error);
    return NextResponse.json(
      { error: "Failed to delete workout" },
      { status: 500 }
    );
  }
}
