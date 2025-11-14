/**
 * Workout Card Type Definitions
 *
 * Defines the card-based representation of workouts for the edit view.
 * Cards can be either exercises or rest periods, and are displayed in a
 * vertical scrolling layout with conditional field visibility.
 */

/**
 * Base card interface with common properties
 */
interface BaseCard {
  id: string;
  type: 'exercise' | 'rest';
}

/**
 * Exercise card representing a single movement/exercise
 *
 * Field visibility rules:
 * - Always show: name, sets, reps
 * - Conditional: weight, distance, timing, rest, notes
 * - In edit mode: show all fields
 * - After edit: re-hide fields that are still empty
 */
export interface ExerciseCard extends BaseCard {
  type: 'exercise';

  // Always visible fields
  name: string;
  sets: number;
  reps: number | string;

  // Conditional fields (only show if populated)
  weight?: string | null;
  distance?: string | null;
  timing?: string | null;  // For EMOM, timed holds, etc.
  restSeconds?: number | null;
  notes?: string | null;

  // Metadata for tracking
  isEditing?: boolean;  // Track if card is currently being edited
  originalExerciseId?: string;  // Link back to source exercise for collapsing
  repetitionIndex?: number;  // Which repetition this card belongs to (for "5 sets")
  totalRepetitions?: number;  // Total number of repetitions (for "Set X of N" display)
}

/**
 * Rest card representing a rest period between exercises
 */
export interface RestCard extends BaseCard {
  type: 'rest';

  // Rest duration in seconds
  duration: number;

  // Optional notes (e.g., "Active rest - light stretching")
  notes?: string | null;

  // Metadata
  repetitionIndex?: number;  // Which repetition this rest belongs to
}

/**
 * Union type for all card types
 */
export type WorkoutCard = ExerciseCard | RestCard;

/**
 * Helper type guards
 */
export function isExerciseCard(card: WorkoutCard): card is ExerciseCard {
  return card.type === 'exercise';
}

export function isRestCard(card: WorkoutCard): card is RestCard {
  return card.type === 'rest';
}

/**
 * Workout repetition metadata
 * Used to expand exercises into repeated card sequences
 */
export interface WorkoutRepetition {
  // Number of times to repeat the entire workout/circuit
  rounds?: number;

  // For "5 sets of X" scenarios
  sets?: number;

  // Pattern of exercises and rest (e.g., "exercise, exercise, rest")
  pattern?: 'standard' | 'circuit' | 'emom' | 'amrap' | 'ladder' | 'tabata';

  // Whether to insert rest between every exercise
  restBetweenExercises?: boolean;

  // Whether to insert rest between rounds/sets
  restBetweenRounds?: boolean;

  // Default rest duration (in seconds)
  defaultRestDuration?: number;
}
