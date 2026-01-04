import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUserId } from "@/lib/api-auth";
import { dynamoDBWorkouts } from "@/lib/dynamodb";
import { checkRateLimit } from "@/lib/rate-limit";
import { z } from "zod";

const scheduleSchema = z
  .object({
    scheduledDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    status: z.enum(['scheduled', 'completed', 'skipped']).optional(),
  })
  .strip();

/**
 * PATCH /api/workouts/[id]/schedule
 * Schedule a workout for a specific date
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getAuthenticatedUserId();
    if ('error' in auth) return auth.error;
    const { userId } = auth;

    const rateLimit = await checkRateLimit(userId, 'api:write');
    if (!rateLimit.success) {
      return NextResponse.json(
        {
          error: 'Too many requests',
          limit: rateLimit.limit,
          remaining: rateLimit.remaining,
          reset: rateLimit.reset,
        },
        {
          status: 429,
          headers: {
            'X-RateLimit-Limit': rateLimit.limit.toString(),
            'X-RateLimit-Remaining': rateLimit.remaining.toString(),
            'X-RateLimit-Reset': rateLimit.reset.toString(),
            'Retry-After': Math.ceil((rateLimit.reset - Date.now()) / 1000).toString(),
          },
        }
      );
    }

    const { id } = await params;

    // Parse request body
    const body = await req.json();
    const parsed = scheduleSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0]?.message || "Invalid request body" },
        { status: 400 }
      );
    }
    const { scheduledDate, status } = parsed.data;

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
    const auth = await getAuthenticatedUserId();
    if ('error' in auth) return auth.error;
    const { userId } = auth;

    const rateLimit = await checkRateLimit(userId, 'api:write');
    if (!rateLimit.success) {
      return NextResponse.json(
        {
          error: 'Too many requests',
          limit: rateLimit.limit,
          remaining: rateLimit.remaining,
          reset: rateLimit.reset,
        },
        {
          status: 429,
          headers: {
            'X-RateLimit-Limit': rateLimit.limit.toString(),
            'X-RateLimit-Remaining': rateLimit.remaining.toString(),
            'X-RateLimit-Reset': rateLimit.reset.toString(),
            'Retry-After': Math.ceil((rateLimit.reset - Date.now()) / 1000).toString(),
          },
        }
      );
    }

    const { id } = await params;

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
