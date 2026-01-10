/**
 * Workout Card Transformer
 *
 * Handles transformation between exercise arrays and card-based layouts.
 * Implements workout repetition logic (e.g., "5 sets" = repeat card sequence 5 times).
 */

import type { WorkoutCard, ExerciseCard, RestCard, WorkoutRepetition } from '@/types/workout-card';

/**
 * Exercise format from edit page
 */
interface EditExercise {
  id: string;
  name: string;
  sets: number;
  reps: number | string;
  weight?: string | null;
  restSeconds?: number | null;
  notes?: string | null;
  distance?: string | null;
  timing?: string | null;
}

/**
 * Expand exercises into a flat array of cards with repetition logic
 *
 * Example: "5 sets of 10 swings, 10 squats, rest between each set"
 * Input: [swing exercise, squat exercise], { sets: 5, restBetweenExercises: true }
 * Output: [swing card, squat card, rest card] × 5 = 15 cards total
 *
 * @param exercises - Array of exercises
 * @param repetition - Repetition metadata (rounds, sets, rest pattern)
 * @returns Flat array of workout cards
 */
export function expandWorkoutToCards(
  exercises: EditExercise[],
  repetition?: WorkoutRepetition
): WorkoutCard[] {
  const cards: WorkoutCard[] = [];

  // Determine number of repetitions
  const repeatCount = repetition?.rounds || repetition?.sets || 1;

  // Determine if we should insert rest cards
  const shouldInsertRestBetweenExercises = repetition?.restBetweenExercises ?? false;
  const shouldInsertRestBetweenRounds = repetition?.restBetweenRounds ?? false;
  const defaultRestDuration = repetition?.defaultRestDuration || 60;

  // Build single sequence of cards (one "set")
  const buildSequence = (repetitionIndex: number): WorkoutCard[] => {
    const sequence: WorkoutCard[] = [];

    exercises.forEach((exercise, exerciseIndex) => {
      // Create exercise card
      const exerciseCard: ExerciseCard = {
        id: `${exercise.id}-rep${repetitionIndex}-${Date.now()}`,
        type: 'exercise',
        name: exercise.name,
        sets: 1,  // Each card represents 1 set
        reps: exercise.reps,
        weight: exercise.weight || null,
        distance: exercise.distance || null,
        timing: exercise.timing || null,
        restSeconds: exercise.restSeconds || null,
        notes: exercise.notes || null,
        isEditing: false,
        originalExerciseId: exercise.id,
        repetitionIndex,
        totalRepetitions: repeatCount,  // Pass total repetitions for "Set X of N" display
      };

      sequence.push(exerciseCard);

      // Insert rest card after exercise (if not last exercise in sequence)
      if (shouldInsertRestBetweenExercises && exerciseIndex < exercises.length - 1) {
        const restCard: RestCard = {
          id: `rest-${exercise.id}-rep${repetitionIndex}-${Date.now()}`,
          type: 'rest',
          duration: exercise.restSeconds || defaultRestDuration,
          repetitionIndex,
        };
        sequence.push(restCard);
      }
    });

    // Insert rest card at end of full sequence (between rounds/sets)
    if (shouldInsertRestBetweenRounds && repetitionIndex < repeatCount - 1) {
      const restCard: RestCard = {
        id: `rest-end-rep${repetitionIndex}-${Date.now()}`,
        type: 'rest',
        duration: defaultRestDuration,
        notes: `Rest before round ${repetitionIndex + 2}`,
        repetitionIndex,
      };
      sequence.push(restCard);
    }

    return sequence;
  };

  // Generate repeated sequences
  for (let i = 0; i < repeatCount; i++) {
    const sequence = buildSequence(i);
    cards.push(...sequence);
  }

  return cards;
}

/**
 * Collapse cards back to exercise array for saving
 *
 * Combines repeated cards into exercise objects with set counts.
 * Filters out rest cards as they're not saved as separate exercises.
 *
 * @param cards - Array of workout cards
 * @returns Array of exercises suitable for saving
 */
export function collapseCardsToExercises(cards: WorkoutCard[]): EditExercise[] {
  // Group exercise cards by original exercise ID and name
  const exerciseMap = new Map<string, ExerciseCard[]>();

  cards.forEach((card) => {
    if (card.type === 'exercise') {
      const key = card.originalExerciseId || card.name;
      if (!exerciseMap.has(key)) {
        exerciseMap.set(key, []);
      }
      exerciseMap.get(key)!.push(card);
    }
  });

  // Convert grouped cards back to exercises
  const exercises: EditExercise[] = [];

  exerciseMap.forEach((cardGroup) => {
    if (cardGroup.length === 0) return;

    // Use first card as template
    const firstCard = cardGroup[0];

    // Count total sets (number of cards with same exercise)
    const totalSets = cardGroup.length;

    const exercise: EditExercise = {
      id: firstCard.originalExerciseId || firstCard.id,
      name: firstCard.name,
      sets: totalSets,
      reps: firstCard.reps,
      weight: firstCard.weight || undefined,
      distance: firstCard.distance || undefined,
      timing: firstCard.timing || undefined,
      restSeconds: firstCard.restSeconds || undefined,
      notes: firstCard.notes || undefined,
    };

    exercises.push(exercise);
  });

  return exercises;
}

/**
 * Create a blank exercise card for "Add Exercise" functionality
 */
export function createBlankExerciseCard(): ExerciseCard {
  return {
    id: `ex-${Date.now()}-${Math.random()}`,
    type: 'exercise',
    name: '',
    sets: 1,
    reps: '',
    weight: null,
    distance: null,
    timing: null,
    restSeconds: 60,
    notes: null,
    isEditing: true,  // Start in edit mode
  };
}

/**
 * Create a rest card
 */
export function createRestCard(duration: number = 60, notes?: string): RestCard {
  return {
    id: `rest-${Date.now()}-${Math.random()}`,
    type: 'rest',
    duration,
    notes: notes || null,
  };
}

/**
 * Detect workout repetition pattern from exercise data
 *
 * Analyzes exercise structure to determine if workout should be expanded
 * into repeated card sequences.
 */
export function detectRepetitionPattern(
  exercises: EditExercise[],
  workoutType?: string
): WorkoutRepetition | undefined {
  // If no exercises, no repetition
  if (exercises.length === 0) return undefined;

  // Check if all exercises have same set count > 1
  const firstSets = exercises[0].sets;
  const allSameSets = exercises.every((ex) => ex.sets === firstSets);

  if (allSameSets && firstSets > 1) {
    // Detected "5 sets of [exercises]" pattern
    return {
      sets: firstSets,
      pattern: 'circuit',
      restBetweenExercises: false,  // No rest between exercises
      restBetweenRounds: true,  // Rest between sets/rounds
      defaultRestDuration: exercises[0].restSeconds || 60,
    };
  }

  // Check workout type for special patterns
  if (workoutType === 'emom' || workoutType === 'amrap') {
    return {
      rounds: 1,  // EMOM/AMRAP typically shown as single sequence
      pattern: workoutType as 'emom' | 'amrap',
      restBetweenExercises: false,
    };
  }

  // Default: no repetition, show as-is
  return undefined;
}
