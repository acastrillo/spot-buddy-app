import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUserId } from "@/lib/api-auth";
import { dynamoDBWorkouts } from "@/lib/dynamodb";
import { checkRateLimit } from "@/lib/rate-limit";
import { z } from "zod";

const completionSchema = z
  .object({
    completedDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    completedAt: z.string().max(100).optional(),
    durationSeconds: z.number().int().min(0).max(86400).optional(),
  })
  .strip();

/**
 * POST /api/workouts/[id]/complete
 * Mark a workout as completed
 */
export async function POST(
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
    const body = await req.json().catch(() => ({}));
    const parsed = completionSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0]?.message || "Invalid request body" },
        { status: 400 }
      );
    }
    const { completedDate, completedAt, durationSeconds } = parsed.data;

    // Mark the workout as completed
    await dynamoDBWorkouts.completeWorkout(
      userId,
      id,
      completedDate,
      completedAt,
      durationSeconds
    );

    return NextResponse.json({
      success: true,
      workoutId: id,
      completedDate: completedDate || new Date().toISOString().split("T")[0],
      completedAt: completedAt || new Date().toISOString(),
      durationSeconds,
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
