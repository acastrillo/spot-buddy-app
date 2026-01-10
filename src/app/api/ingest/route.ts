import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUserId } from "@/lib/api-auth";
import { parseWorkoutContent } from "@/lib/smartWorkoutParser";
import { checkRateLimit } from "@/lib/rate-limit";
import { z } from "zod";

const ingestSchema = z
  .object({
    caption: z.string().min(1).max(20000),
  })
  .strip();

export async function POST(req: NextRequest){
  try {
    // SECURITY FIX: Use new auth utility
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

    const body = await req.json();
    const parsed = ingestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0]?.message || "Invalid request body" },
        { status: 400 }
      );
    }
    const { caption } = parsed.data;

    // Use smart workout parser
    const parsedWorkout = parseWorkoutContent(caption);

    // Create backward-compatible rows format
    const rows = parsedWorkout.exercises.map(exercise => ({
      id: exercise.id,
      movement: exercise.name,
      sets: exercise.sets,
      reps: exercise.reps,
      weight: exercise.weight,
      notes: exercise.notes
    }));

    // Estimate duration based on workout structure
    let estimatedDuration = 20; // default
    switch (parsedWorkout.structure.type) {
      case 'ladder':
        estimatedDuration = (parsedWorkout.structure.values?.length || 1) * parsedWorkout.exercises.length * 2;
        break;
      case 'rounds':
        estimatedDuration = (parsedWorkout.structure.rounds || 1) * parsedWorkout.exercises.length * 2;
        break;
      case 'amrap':
      case 'emom':
        estimatedDuration = parsedWorkout.structure.timeLimit || 20;
        break;
      case 'tabata':
        estimatedDuration = 8 * 0.5; // 8 rounds of 30s each
        break;
      default:
        estimatedDuration = parsedWorkout.exercises.length * 3;
    }

    return NextResponse.json({
      exercises: parsedWorkout.exercises,
      rows,
      summary: parsedWorkout.summary,
      breakdown: parsedWorkout.breakdown,
      structure: parsedWorkout.structure,
      usedLLM: false,
      workoutV1: {
        name: `Smart Parsed Workout (${parsedWorkout.structure.type})`,
        totalDuration: estimatedDuration,
        difficulty: parsedWorkout.exercises.length > 4 ? 'hard' : 'moderate',
        tags: ['smart-parsed', parsedWorkout.structure.type]
      }
    });

  } catch (error) {
    console.error('Error processing workout:', error);
    return NextResponse.json(
      { error: "Failed to process workout" },
      { status: 500 }
    );
  }
}
