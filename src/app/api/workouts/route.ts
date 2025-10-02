import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { dynamoDBWorkouts } from "@/lib/dynamodb";

// GET /api/workouts - List all workouts for the current user
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const limit = searchParams.get("limit");

    const workouts = await dynamoDBWorkouts.list(
      session.user.id,
      limit ? parseInt(limit) : undefined
    );

    return NextResponse.json({ workouts });
  } catch (error) {
    console.error("Error fetching workouts:", error);
    return NextResponse.json(
      { error: "Failed to fetch workouts" },
      { status: 500 }
    );
  }
}

// POST /api/workouts - Create a new workout
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

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
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const workout = await dynamoDBWorkouts.upsert(session.user.id, {
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

    return NextResponse.json({ workout }, { status: 201 });
  } catch (error) {
    console.error("Error creating workout:", error);
    return NextResponse.json(
      { error: "Failed to create workout" },
      { status: 500 }
    );
  }
}
