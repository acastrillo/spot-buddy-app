/**
 * AMRAP Backward Compatibility Helpers
 *
 * Provides utilities to normalize old single-block AMRAP workouts
 * to the new multi-block format without requiring database migration
 */

import type { AMRAPBlock, AMRAPWorkout, Exercise } from '@/types/amrap'

/**
 * Normalize any AMRAP workout to an array of blocks
 * Handles both old single-block and new multi-block formats
 *
 * @param workout - AMRAP workout in any format
 * @returns Array of AMRAP blocks (always returns array, even for single block)
 */
export function normalizeAMRAPWorkout(workout: AMRAPWorkout): AMRAPBlock[] {
  // If already multi-block format, return as-is
  if (workout.amrapBlocks && workout.amrapBlocks.length > 0) {
    const hasBlockExercises = workout.amrapBlocks.some(
      (block) => (block.exercises?.length ?? 0) > 0
    )
    if (hasBlockExercises) {
      return workout.amrapBlocks.sort((a, b) => a.order - b.order)
    }
  }

  // Convert single-block to array format (backward compatible)
  const fallbackTimeLimit =
    workout.amrapBlocks?.reduce((sum, block) => sum + (block.timeLimit || 0), 0) ||
    0
  const timeLimit =
    fallbackTimeLimit > 0 ? fallbackTimeLimit : workout.structure?.timeLimit || 720 // Default 12 minutes
  const exercises = workout.exercises || []

  return [
    {
      id: 'single',
      label: 'AMRAP',
      timeLimit,
      order: 1,
      exercises,
    },
  ]
}

/**
 * Check if workout has multiple AMRAP blocks
 *
 * @param workout - AMRAP workout
 * @returns True if workout has 2+ blocks
 */
export function isMultiBlockAMRAP(workout: AMRAPWorkout): boolean {
  return Boolean(workout.amrapBlocks && workout.amrapBlocks.length > 1)
}

/**
 * Get exercises for a specific block
 *
 * @param workout - AMRAP workout
 * @param blockIndex - Zero-based block index
 * @returns Exercises for that block
 */
export function getBlockExercises(
  workout: AMRAPWorkout,
  blockIndex: number
): Exercise[] {
  const blocks = normalizeAMRAPWorkout(workout)

  if (blockIndex < 0 || blockIndex >= blocks.length) {
    console.warn(`Block index ${blockIndex} out of bounds`)
    return []
  }

  return blocks[blockIndex].exercises
}

/**
 * Get time limit for a specific block
 *
 * @param workout - AMRAP workout
 * @param blockIndex - Zero-based block index
 * @returns Time limit in seconds
 */
export function getBlockTimeLimit(
  workout: AMRAPWorkout,
  blockIndex: number
): number {
  const blocks = normalizeAMRAPWorkout(workout)

  if (blockIndex < 0 || blockIndex >= blocks.length) {
    console.warn(`Block index ${blockIndex} out of bounds`)
    return 720 // Default 12 minutes
  }

  return blocks[blockIndex].timeLimit
}

/**
 * Get total number of blocks
 *
 * @param workout - AMRAP workout
 * @returns Number of blocks (minimum 1)
 */
export function getBlockCount(workout: AMRAPWorkout): number {
  const blocks = normalizeAMRAPWorkout(workout)
  return blocks.length
}

/**
 * Get total workout duration across all blocks
 *
 * @param workout - AMRAP workout
 * @returns Total duration in seconds
 */
export function getTotalDuration(workout: AMRAPWorkout): number {
  const blocks = normalizeAMRAPWorkout(workout)
  return blocks.reduce((sum, block) => sum + block.timeLimit, 0)
}

/**
 * Format time from seconds to MM:SS
 *
 * @param seconds - Time in seconds
 * @returns Formatted string (e.g., "12:30")
 */
export function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

/**
 * Calculate rounds completed from checked exercises
 *
 * @param checkedCount - Number of checked exercises
 * @param exercisesPerRound - Exercises in the circuit
 * @returns Number of complete rounds
 */
export function calculateRoundsCompleted(
  checkedCount: number,
  exercisesPerRound: number
): number {
  if (exercisesPerRound === 0) return 0
  return Math.floor(checkedCount / exercisesPerRound)
}

/**
 * Calculate partial round reps
 *
 * @param checkedCount - Number of checked exercises
 * @param exercisesPerRound - Exercises in the circuit
 * @returns Number of exercises in partial round
 */
export function calculatePartialReps(
  checkedCount: number,
  exercisesPerRound: number
): number {
  if (exercisesPerRound === 0) return 0
  return checkedCount % exercisesPerRound
}

/**
 * Calculate completed rounds using per-exercise progress.
 * A round is counted only when every exercise has been performed once.
 */
export function calculateRoundsFromProgress(
  exercises: Exercise[],
  checkedExercises: Set<string>,
  exerciseCounts: Map<string, number>
): number {
  if (exercises.length === 0) return 0

  const perExerciseCounts = exercises.map((exercise) => {
    const tapCount = exerciseCounts.get(exercise.id) ?? 0
    // Checking still counts for one completion to stay backward compatible
    const checkCredit = checkedExercises.has(exercise.id) ? 1 : 0
    return Math.max(tapCount, checkCredit)
  })

  return Math.min(...perExerciseCounts)
}

/**
 * Calculate partial progress beyond fully completed rounds.
 */
export function calculatePartialRepsFromProgress(
  exercises: Exercise[],
  checkedExercises: Set<string>,
  exerciseCounts: Map<string, number>
): number {
  if (exercises.length === 0) return 0

  const roundsCompleted = calculateRoundsFromProgress(exercises, checkedExercises, exerciseCounts)

  const partialProgress = exercises.reduce((partial, exercise) => {
    const tapCount = exerciseCounts.get(exercise.id) ?? 0
    const checkCredit = checkedExercises.has(exercise.id) ? 1 : 0
    const progress = Math.max(tapCount, checkCredit)
    const remaining = progress - roundsCompleted
    return partial + Math.max(0, remaining)
  }, 0)

  // Cap partial progress to a single additional round for clarity
  return Math.min(partialProgress, Math.max(exercises.length - 1, 0))
}

/**
 * Format completion score for display
 * Example: "5 rounds + 3 reps"
 *
 * @param checkedCount - Number of checked exercises
 * @param exercisesPerRound - Exercises in the circuit
 * @returns Formatted score string
 */
export function formatCompletionScore(
  checkedCount: number,
  exercisesPerRound: number
): string {
  const rounds = calculateRoundsCompleted(checkedCount, exercisesPerRound)
  const partial = calculatePartialReps(checkedCount, exercisesPerRound)

  if (partial === 0) {
    return `${rounds} round${rounds !== 1 ? 's' : ''}`
  }

  return `${rounds} round${rounds !== 1 ? 's' : ''} + ${partial} rep${partial !== 1 ? 's' : ''}`
}
