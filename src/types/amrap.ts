/**
 * AMRAP (As Many Rounds As Possible) Type Definitions
 *
 * Supports both single-block and multi-block AMRAP workouts
 */

export interface Exercise {
  id: string
  name: string
  sets: number
  reps: string | number
  weight?: string | null
  restSeconds?: number | null
  notes?: string | null
  setDetails?: Array<{
    id?: string
    reps?: string | number | null
    weight?: string | number | null
  }>
}

/**
 * Single AMRAP block within a workout
 * Can be standalone or part of a multi-block workout
 */
export interface AMRAPBlock {
  id: string
  label: string // "Part A", "Block 1", "AMRAP"
  timeLimit: number // seconds
  order: number
  exercises: Exercise[]

  // Completion tracking
  completed?: boolean
  completedAt?: string
  roundsCompleted?: number
  notes?: string
}

/**
 * State for a single AMRAP block during a session
 */
export interface BlockState {
  completed: boolean
  roundsCompleted: number
  checkedExercises: Set<string>
  exerciseCounts?: Map<string, number>
  timeRemaining?: number
  notes?: string
}

/**
 * Complete AMRAP session state
 * Tracks current block and states of all blocks
 */
export interface AMRAPSessionState {
  currentBlockIndex: number
  blockStates: Map<string, BlockState>
  isTransitioning: boolean
  sessionStartedAt?: Date
}

/**
 * AMRAP workout structure
 * Supports both single-block (backward compatible) and multi-block formats
 */
export interface AMRAPWorkout {
  id: string
  title: string
  description?: string
  workoutType: 'amrap'

  // Single block (backward compatible)
  structure?: {
    timeLimit?: number // seconds
  }

  // Multi-block (new format)
  amrapBlocks?: AMRAPBlock[]

  // For single-block, exercises at root level
  exercises?: Exercise[]
}

/**
 * Helper to determine if workout is multi-block
 */
export function isMultiBlockAMRAP(workout: AMRAPWorkout): boolean {
  return Boolean(workout.amrapBlocks && workout.amrapBlocks.length > 1)
}

/**
 * Get total number of blocks
 */
export function getBlockCount(workout: AMRAPWorkout): number {
  if (workout.amrapBlocks && workout.amrapBlocks.length > 0) {
    return workout.amrapBlocks.length
  }
  return 1 // Single block
}

/**
 * Get total workout duration across all blocks
 */
export function getTotalDuration(workout: AMRAPWorkout): number {
  if (workout.amrapBlocks && workout.amrapBlocks.length > 0) {
    return workout.amrapBlocks.reduce((sum, block) => sum + block.timeLimit, 0)
  }
  return workout.structure?.timeLimit || 720 // Default 12 minutes
}
