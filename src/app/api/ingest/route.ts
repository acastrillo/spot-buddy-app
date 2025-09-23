import { NextRequest, NextResponse } from "next/server";
import { parseWorkoutContent } from "@/lib/smartWorkoutParser";

export async function POST(req: NextRequest){
  try {
    const { caption } = await req.json();

    if (!caption) {
      return NextResponse.json({ error: "Caption is required" }, { status: 400 });
    }

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