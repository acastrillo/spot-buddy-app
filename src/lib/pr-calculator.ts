/**
 * PR Calculator - Calculate 1RM estimates and identify personal records
 *
 * Formulas used:
 * - Brzycki: 1RM = weight / (1.0278 - 0.0278 × reps)
 * - Epley: 1RM = weight × (1 + reps / 30)
 */

export interface ExerciseSet {
  weight: number; // in lbs or kg
  reps: number;
  unit?: 'lbs' | 'kg';
}

export interface PR {
  exercise: string;
  weight: number;
  reps: number;
  estimatedOneRepMax: number;
  date: string;
  workoutId: string;
  formula: 'brzycki' | 'epley' | 'actual';
}

/**
 * Calculate 1RM using Brzycki formula
 * Most accurate for reps between 1-10
 */
export function calculateBrzycki(weight: number, reps: number): number {
  if (reps === 1) return weight;
  if (reps > 12) return weight; // Less accurate for high reps
  return weight / (1.0278 - 0.0278 * reps);
}

/**
 * Calculate 1RM using Epley formula
 * Good for reps between 1-10
 */
export function calculateEpley(weight: number, reps: number): number {
  if (reps === 1) return weight;
  return weight * (1 + reps / 30);
}

/**
 * Calculate average of both formulas for best estimate
 */
export function calculateOneRepMax(weight: number, reps: number): number {
  if (reps === 1) return weight;
  const brzycki = calculateBrzycki(weight, reps);
  const epley = calculateEpley(weight, reps);
  return Math.round((brzycki + epley) / 2);
}

/**
 * Parse weight string like "185 lbs", "80kg", "225"
 */
export function parseWeight(weightStr: string): { value: number; unit: 'lbs' | 'kg' } | null {
  const match = weightStr.match(/(\d+\.?\d*)\s*(lbs?|kgs?|kilos?)?/i);
  if (!match) return null;

  const value = parseFloat(match[1]);
  const unitMatch = match[2]?.toLowerCase();

  let unit: 'lbs' | 'kg' = 'lbs'; // Default to lbs
  if (unitMatch && (unitMatch.startsWith('kg') || unitMatch.startsWith('kilo'))) {
    unit = 'kg';
  }

  return { value, unit };
}

/**
 * Convert kg to lbs
 */
export function kgToLbs(kg: number): number {
  return kg * 2.20462;
}

/**
 * Convert lbs to kg
 */
export function lbsToKg(lbs: number): number {
  return lbs / 2.20462;
}

/**
 * Normalize weight to lbs for comparison
 */
export function normalizeWeight(weight: number, unit: 'lbs' | 'kg'): number {
  return unit === 'kg' ? kgToLbs(weight) : weight;
}

/**
 * Calculate volume load (weight × reps)
 */
export function calculateVolumeLoad(weight: number, reps: number): number {
  return weight * reps;
}

/**
 * Identify PRs from workout history
 * Groups by exercise and finds max weight for each rep range
 */
export interface WorkoutExercise {
  name: string;
  sets: ExerciseSet[];
  date: string;
  workoutId: string;
}

export function identifyPRs(exercises: WorkoutExercise[]): PR[] {
  const prsByExercise = new Map<string, Map<number, PR>>();

  for (const exercise of exercises) {
    const exerciseName = exercise.name.toLowerCase().trim();

    if (!prsByExercise.has(exerciseName)) {
      prsByExercise.set(exerciseName, new Map());
    }

    const exercisePRs = prsByExercise.get(exerciseName)!;

    for (const set of exercise.sets) {
      if (!set.weight || !set.reps) continue;

      const normalizedWeight = normalizeWeight(set.weight, set.unit || 'lbs');
      const oneRepMax = calculateOneRepMax(normalizedWeight, set.reps);

      // Check if this is a PR for this rep range
      const existingPR = exercisePRs.get(set.reps);

      if (!existingPR || normalizedWeight > existingPR.weight) {
        exercisePRs.set(set.reps, {
          exercise: exercise.name,
          weight: normalizedWeight,
          reps: set.reps,
          estimatedOneRepMax: oneRepMax,
          date: exercise.date,
          workoutId: exercise.workoutId,
          formula: set.reps === 1 ? 'actual' : 'brzycki',
        });
      }
    }
  }

  // Flatten to array
  const allPRs: PR[] = [];
  for (const exercisePRs of prsByExercise.values()) {
    allPRs.push(...Array.from(exercisePRs.values()));
  }

  // Sort by estimated 1RM descending
  return allPRs.sort((a, b) => b.estimatedOneRepMax - a.estimatedOneRepMax);
}

/**
 * Get PRs for a specific exercise
 */
export function getPRsForExercise(prs: PR[], exerciseName: string): PR[] {
  const normalized = exerciseName.toLowerCase().trim();
  return prs
    .filter(pr => pr.exercise.toLowerCase().trim() === normalized)
    .sort((a, b) => b.estimatedOneRepMax - a.estimatedOneRepMax);
}

/**
 * Check if a set is a new PR
 */
export function isNewPR(
  exerciseName: string,
  weight: number,
  reps: number,
  unit: 'lbs' | 'kg',
  existingPRs: PR[]
): boolean {
  const normalizedWeight = normalizeWeight(weight, unit);
  const exercisePRs = getPRsForExercise(existingPRs, exerciseName);

  // Check if this weight is higher than any existing PR for this rep range
  const repRangePR = exercisePRs.find(pr => pr.reps === reps);

  if (!repRangePR) {
    // First time doing this rep range
    return weight > 0;
  }

  return normalizedWeight > repRangePR.weight;
}

/**
 * Format weight for display
 */
export function formatWeight(weight: number, unit: 'lbs' | 'kg' = 'lbs'): string {
  return `${Math.round(weight)} ${unit}`;
}

/**
 * Format 1RM for display
 */
export function formatOneRepMax(oneRepMax: number): string {
  return `${Math.round(oneRepMax)} lbs`;
}
