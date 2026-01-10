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
  unit?: "lbs" | "kg";
}

export interface PR {
  exercise: string;
  weight: number;
  reps: number;
  estimatedOneRepMax: number;
  date: string;
  workoutId: string;
  formula: "brzycki" | "epley" | "actual";
}

export interface PersonalRecord {
  exerciseName: string;
  weight: number;
  reps: number;
  unit: "lbs" | "kg";
  date: string;
  workoutId: string;
  oneRepMax: number;
  source: "brzycki" | "epley" | "actual";
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
export function parseWeight(weightStr: string): { value: number; unit: "lbs" | "kg" } | null {
  const match = weightStr.match(/(\d+\.?\d*)\s*(lbs?|kgs?|kilos?)?/i);
  if (!match) return null;

  const value = parseFloat(match[1]);
  const unitMatch = match[2]?.toLowerCase();

  let unit: "lbs" | "kg" = "lbs"; // Default to lbs
  if (unitMatch && (unitMatch.startsWith("kg") || unitMatch.startsWith("kilo"))) {
    unit = "kg";
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
export function normalizeWeight(weight: number, unit: "lbs" | "kg"): number {
  return unit === "kg" ? kgToLbs(weight) : weight;
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
  unit: "lbs" | "kg",
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
export function formatWeight(weight: number, unit: "lbs" | "kg" = "lbs"): string {
  return `${Math.round(weight)} ${unit}`;
}

/**
 * Format 1RM for display
 */
export function formatOneRepMax(oneRepMax: number): string {
  return `${Math.round(oneRepMax)} lbs`;
}

const normalizeUnit = (unit?: string | null): "lbs" | "kg" => {
  if (!unit) return "lbs";
  const normalized = unit.toLowerCase();
  if (normalized.startsWith("kg") || normalized.startsWith("kilo")) {
    return "kg";
  }
  return "lbs";
};

const parseRepsValue = (input: unknown): number => {
  if (typeof input === "number") {
    return Number.isFinite(input) ? input : 0;
  }
  if (typeof input === "string") {
    const match = input.match(/\d+/);
    return match ? parseInt(match[0], 10) : 0;
  }
  return 0;
};

const parseWeightValue = (weight: unknown): { value: number; unit: "lbs" | "kg" } | null => {
  if (typeof weight === "number") {
    return { value: weight, unit: "lbs" };
  }
  if (typeof weight === "string" && weight.trim().length > 0) {
    return parseWeight(weight);
  }
  return null;
};

type RawExercise = {
  name?: string;
  sets?: Array<{
    weight?: unknown;
    reps?: unknown;
    unit?: string | null;
  }>;
  weight?: unknown;
  reps?: unknown;
  unit?: string | null;
  setDetails?: Array<{
    id?: string | null;
    weight?: unknown;
    reps?: unknown;
    unit?: string | null;
  }>;
};

type RawWorkout = {
  workoutId?: string;
  id?: string;
  createdAt?: string;
  date?: string;
  performedAt?: string;
  exercises?: RawExercise[];
};

const deriveWorkoutDate = (workout: RawWorkout): string => {
  return (
    workout.createdAt ||
    workout.date ||
    workout.performedAt ||
    new Date().toISOString()
  );
};

const deriveWorkoutId = (workout: RawWorkout): string => {
  return workout.workoutId || workout.id || deriveWorkoutDate(workout);
};

const collectExerciseSets = (exercise: RawExercise): ExerciseSet[] => {
  const sets: ExerciseSet[] = [];

  const pushSet = (weightValue: unknown, repsValue: unknown, unit?: string | null) => {
    const parsed = parseWeightValue(weightValue);
    const reps = parseRepsValue(repsValue);
    if (parsed && parsed.value > 0 && reps > 0) {
      sets.push({
        weight: parsed.value,
        reps,
        unit: normalizeUnit(unit || (typeof weightValue === "string" ? parsed.unit : exercise.unit)),
      });
    }
  };

  if (exercise.setDetails && Array.isArray(exercise.setDetails) && exercise.setDetails.length > 0) {
    for (const detail of exercise.setDetails) {
      pushSet(detail?.weight, detail?.reps, detail?.unit);
    }
  } else if (exercise.sets && Array.isArray(exercise.sets) && exercise.sets.length > 0) {
    for (const set of exercise.sets) {
      pushSet(set.weight, set.reps, set.unit);
    }
  } else {
    pushSet(exercise.weight, exercise.reps, exercise.unit);
  }

  return sets;
};

const isBetterPR = (candidate: PersonalRecord, currentBest: PersonalRecord | null): boolean => {
  if (!currentBest) return true;
  if (candidate.oneRepMax > currentBest.oneRepMax) return true;
  if (candidate.oneRepMax === currentBest.oneRepMax) {
    if (candidate.reps < currentBest.reps) return true;
    if (candidate.reps === currentBest.reps) {
      return candidate.weight > currentBest.weight;
    }
  }
  return false;
};

export function calculate1RM(weight: number, reps: number, unit: "lbs" | "kg" = "lbs"): number {
  if (weight <= 0 || reps <= 0) return 0;
  const normalizedWeight = normalizeWeight(weight, unit);
  const estimate = calculateOneRepMax(normalizedWeight, reps);
  if (unit === "kg") {
    return Math.round(lbsToKg(estimate));
  }
  return Math.round(estimate);
}

export function getCurrentPR(
  exerciseName: string,
  prs: PersonalRecord[]
): PersonalRecord | null {
  const normalized = exerciseName.toLowerCase().trim();
  const matches = prs.filter(pr => pr.exerciseName.toLowerCase().trim() === normalized);
  if (matches.length === 0) {
    return null;
  }
  return matches.reduce((best, current) => (isBetterPR(current, best) ? current : best));
}

export function getPRHistory(exerciseName: string, prs: PersonalRecord[]): PersonalRecord[] {
  const normalized = exerciseName.toLowerCase().trim();
  return prs
    .filter(pr => pr.exerciseName.toLowerCase().trim() === normalized)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
}

export function extractPRsFromWorkout(
  workout: RawWorkout,
  existingPRs: PersonalRecord[] = []
): PersonalRecord[] {
  if (!workout || !Array.isArray(workout.exercises)) {
    return [];
  }

  const workoutDate = deriveWorkoutDate(workout);
  const workoutId = deriveWorkoutId(workout);
  const newPRs: PersonalRecord[] = [];

  for (const exercise of workout.exercises) {
    if (!exercise || !exercise.name) continue;

    const sets = collectExerciseSets(exercise);
    if (sets.length === 0) continue;

    const exerciseName = exercise.name.trim();

    for (const set of sets) {
      const unit = normalizeUnit(set.unit);
      const oneRepMax = calculate1RM(set.weight, set.reps, unit);
      if (oneRepMax <= 0) continue;

      const candidate: PersonalRecord = {
        exerciseName,
        weight: set.weight,
        reps: set.reps,
        unit,
        date: workoutDate,
        workoutId,
        oneRepMax,
        source: set.reps === 1 ? "actual" : "brzycki",
      };

      const currentBest = getCurrentPR(exerciseName, [...existingPRs, ...newPRs]);
      if (isBetterPR(candidate, currentBest)) {
        newPRs.push(candidate);
      }
    }
  }

  return newPRs;
}
