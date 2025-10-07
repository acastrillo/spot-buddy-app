/**
 * Exercise History - Extract and analyze exercise data from workouts
 */

import type { DynamoDBWorkout } from "./dynamodb";
import type { WorkoutExercise } from "./pr-calculator";
import { parseWeight, type ExerciseSet } from "./pr-calculator";

/**
 * Extract exercises from workout
 */
export function extractExercisesFromWorkout(workout: DynamoDBWorkout): WorkoutExercise[] {
  const exercises: WorkoutExercise[] = [];

  if (!workout.exercises || workout.exercises.length === 0) {
    return exercises;
  }

  for (const exercise of workout.exercises) {
    const sets: ExerciseSet[] = [];

    // Parse sets from exercise
    if (exercise.sets && Array.isArray(exercise.sets)) {
      for (const set of exercise.sets) {
        // Handle different set formats
        const weight = typeof set.weight === 'string' ? parseWeight(set.weight) : null;
        const reps = typeof set.reps === 'number' ? set.reps : parseInt(String(set.reps || 0));

        if (weight && weight.value > 0 && reps > 0) {
          sets.push({
            weight: weight.value,
            reps,
            unit: weight.unit,
          });
        }
      }
    }

    if (sets.length > 0) {
      exercises.push({
        name: exercise.name || 'Unknown',
        sets,
        date: workout.createdAt,
        workoutId: workout.workoutId,
      });
    }
  }

  return exercises;
}

/**
 * Extract all exercises from multiple workouts
 */
export function extractExercisesFromWorkouts(workouts: DynamoDBWorkout[]): WorkoutExercise[] {
  const allExercises: WorkoutExercise[] = [];

  for (const workout of workouts) {
    const exercises = extractExercisesFromWorkout(workout);
    allExercises.push(...exercises);
  }

  return allExercises;
}

/**
 * Get unique exercise names from workouts
 */
export function getUniqueExerciseNames(workouts: DynamoDBWorkout[]): string[] {
  const names = new Set<string>();

  for (const workout of workouts) {
    if (workout.exercises) {
      for (const exercise of workout.exercises) {
        if (exercise.name) {
          names.add(exercise.name.trim());
        }
      }
    }
  }

  return Array.from(names).sort();
}

/**
 * Get workout history for a specific exercise
 */
export function getExerciseHistory(
  workouts: DynamoDBWorkout[],
  exerciseName: string
): WorkoutExercise[] {
  const normalized = exerciseName.toLowerCase().trim();
  const history: WorkoutExercise[] = [];

  for (const workout of workouts) {
    const exercises = extractExercisesFromWorkout(workout);
    const matches = exercises.filter(
      ex => ex.name.toLowerCase().trim() === normalized
    );
    history.push(...matches);
  }

  // Sort by date descending (most recent first)
  return history.sort((a, b) =>
    new Date(b.date).getTime() - new Date(a.date).getTime()
  );
}

/**
 * Calculate total volume for exercise across all workouts
 */
export function calculateExerciseVolume(exercises: WorkoutExercise[]): number {
  let totalVolume = 0;

  for (const exercise of exercises) {
    for (const set of exercise.sets) {
      totalVolume += set.weight * set.reps;
    }
  }

  return totalVolume;
}

/**
 * Get exercise frequency (times performed)
 */
export function getExerciseFrequency(
  workouts: DynamoDBWorkout[],
  exerciseName: string
): number {
  const history = getExerciseHistory(workouts, exerciseName);
  return history.length;
}

/**
 * Get last time exercise was performed
 */
export function getLastPerformed(
  workouts: DynamoDBWorkout[],
  exerciseName: string
): string | null {
  const history = getExerciseHistory(workouts, exerciseName);
  return history.length > 0 ? history[0].date : null;
}

/**
 * Calculate average weight for exercise
 */
export function calculateAverageWeight(exercises: WorkoutExercise[]): number {
  if (exercises.length === 0) return 0;

  let totalWeight = 0;
  let count = 0;

  for (const exercise of exercises) {
    for (const set of exercise.sets) {
      totalWeight += set.weight;
      count++;
    }
  }

  return count > 0 ? totalWeight / count : 0;
}

/**
 * Calculate average reps for exercise
 */
export function calculateAverageReps(exercises: WorkoutExercise[]): number {
  if (exercises.length === 0) return 0;

  let totalReps = 0;
  let count = 0;

  for (const exercise of exercises) {
    for (const set of exercise.sets) {
      totalReps += set.reps;
      count++;
    }
  }

  return count > 0 ? totalReps / count : 0;
}

/**
 * Group exercises by muscle group (basic categorization)
 */
export function categorizeExerciseByMuscleGroup(exerciseName: string): string {
  const name = exerciseName.toLowerCase();

  // Chest
  if (name.includes('bench') || name.includes('chest') || name.includes('flye') || name.includes('fly')) {
    return 'Chest';
  }

  // Back
  if (name.includes('row') || name.includes('pull') || name.includes('deadlift') || name.includes('lat')) {
    return 'Back';
  }

  // Shoulders
  if (name.includes('shoulder') || name.includes('press') || name.includes('raise') || name.includes('delt')) {
    return 'Shoulders';
  }

  // Arms
  if (name.includes('curl') || name.includes('tricep') || name.includes('bicep') || name.includes('extension')) {
    return 'Arms';
  }

  // Legs
  if (name.includes('squat') || name.includes('leg') || name.includes('lunge') || name.includes('calf')) {
    return 'Legs';
  }

  // Core
  if (name.includes('ab') || name.includes('core') || name.includes('plank') || name.includes('crunch')) {
    return 'Core';
  }

  return 'Other';
}

/**
 * Get volume distribution by muscle group
 */
export function getVolumeByMuscleGroup(workouts: DynamoDBWorkout[]): Record<string, number> {
  const volumeByGroup: Record<string, number> = {};

  const allExercises = extractExercisesFromWorkouts(workouts);

  for (const exercise of allExercises) {
    const group = categorizeExerciseByMuscleGroup(exercise.name);

    if (!volumeByGroup[group]) {
      volumeByGroup[group] = 0;
    }

    for (const set of exercise.sets) {
      volumeByGroup[group] += set.weight * set.reps;
    }
  }

  return volumeByGroup;
}
