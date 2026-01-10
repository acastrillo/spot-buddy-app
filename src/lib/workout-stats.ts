import { DynamoDBWorkout } from "./dynamodb";

export interface WorkoutStats {
  totalWorkouts: number;
  totalExercises: number;
  totalVolume: number; // Total weight × reps across all workouts
  averageDuration: number; // Minutes
  totalMinutes: number;
  streakDays: number; // Consecutive days with workouts
  longestStreak: number;
  favoriteExercises: Array<{ name: string; count: number }>;
  personalRecords: Array<{
    exercise: string;
    weight: string;
    reps: string | number;
    date: string;
  }>;
  workoutsByMonth: Array<{ month: string; count: number }>;
  volumeByMonth: Array<{ month: string; volume: number }>;
  recentWorkouts: DynamoDBWorkout[];
}

/**
 * Calculate comprehensive workout statistics
 */
export function calculateWorkoutStats(workouts: DynamoDBWorkout[]): WorkoutStats {
  if (workouts.length === 0) {
    return {
      totalWorkouts: 0,
      totalExercises: 0,
      totalVolume: 0,
      averageDuration: 0,
      totalMinutes: 0,
      streakDays: 0,
      longestStreak: 0,
      favoriteExercises: [],
      personalRecords: [],
      workoutsByMonth: [],
      volumeByMonth: [],
      recentWorkouts: [],
    };
  }

  // Sort by date (most recent first)
  const sortedWorkouts = [...workouts].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  // Basic stats
  const totalWorkouts = workouts.length;
  const totalExercises = workouts.reduce((sum, w) => sum + w.exercises.length, 0);
  const totalMinutes = workouts.reduce((sum, w) => sum + (w.totalDuration || 0), 0);
  const averageDuration = totalMinutes / totalWorkouts;

  // Calculate total volume
  const totalVolume = calculateTotalVolume(workouts);

  // Calculate streaks
  const { current: streakDays, longest: longestStreak } = calculateStreaks(sortedWorkouts);

  // Favorite exercises (top 5)
  const favoriteExercises = calculateFavoriteExercises(workouts);

  // Personal records
  const personalRecords = calculatePersonalRecords(workouts);

  // Workouts by month
  const workoutsByMonth = calculateWorkoutsByMonth(workouts);

  // Volume by month
  const volumeByMonth = calculateVolumeByMonth(workouts);

  return {
    totalWorkouts,
    totalExercises,
    totalVolume,
    averageDuration: Math.round(averageDuration),
    totalMinutes,
    streakDays,
    longestStreak,
    favoriteExercises,
    personalRecords,
    workoutsByMonth,
    volumeByMonth,
    recentWorkouts: sortedWorkouts.slice(0, 5),
  };
}

/**
 * Calculate total volume (weight × reps × sets)
 */
function calculateTotalVolume(workouts: DynamoDBWorkout[]): number {
  let volume = 0;

  for (const workout of workouts) {
    for (const exercise of workout.exercises) {
      const setDetails =
        exercise.setDetails && exercise.setDetails.length > 0
          ? exercise.setDetails
          : Array.from({ length: exercise.sets || 1 }).map(() => ({
              reps: exercise.reps,
              weight: exercise.weight,
            }));

      for (const detail of setDetails) {
        const weight = parseWeight(detail?.weight ?? exercise.weight);
        const reps = parseReps(detail?.reps ?? exercise.reps);

        if (weight > 0 && reps > 0) {
          volume += weight * reps;
        }
      }
    }
  }

  return Math.round(volume);
}

/**
 * Calculate workout streaks (consecutive days)
 */
function calculateStreaks(
  sortedWorkouts: DynamoDBWorkout[]
): { current: number; longest: number } {
  if (sortedWorkouts.length === 0) {
    return { current: 0, longest: 0 };
  }

  const workoutDates = sortedWorkouts
    .map((w) => new Date(w.createdAt).toDateString())
    .filter((date, index, self) => self.indexOf(date) === index); // Unique dates

  let currentStreak = 1;
  let longestStreak = 1;
  let tempStreak = 1;

  const today = new Date().toDateString();
  const yesterday = new Date(Date.now() - 86400000).toDateString();

  // Check if current streak is active
  if (workoutDates[0] !== today && workoutDates[0] !== yesterday) {
    currentStreak = 0;
  }

  // Calculate streaks
  for (let i = 0; i < workoutDates.length - 1; i++) {
    const current = new Date(workoutDates[i]);
    const next = new Date(workoutDates[i + 1]);
    const daysDiff = Math.round((current.getTime() - next.getTime()) / 86400000);

    if (daysDiff === 1) {
      tempStreak++;
      if (i === 0 && currentStreak > 0) {
        currentStreak = tempStreak;
      }
    } else {
      longestStreak = Math.max(longestStreak, tempStreak);
      tempStreak = 1;
    }
  }

  longestStreak = Math.max(longestStreak, tempStreak);

  return { current: currentStreak, longest: longestStreak };
}

/**
 * Get top 5 most frequent exercises
 */
function calculateFavoriteExercises(
  workouts: DynamoDBWorkout[]
): Array<{ name: string; count: number }> {
  const exerciseCounts = new Map<string, number>();

  for (const workout of workouts) {
    for (const exercise of workout.exercises) {
      const name = exercise.name.trim().toLowerCase();
      exerciseCounts.set(name, (exerciseCounts.get(name) || 0) + 1);
    }
  }

  return Array.from(exerciseCounts.entries())
    .map(([name, count]) => ({ name: capitalizeWords(name), count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);
}

/**
 * Calculate personal records (max weight for each exercise)
 */
function calculatePersonalRecords(
  workouts: DynamoDBWorkout[]
): Array<{ exercise: string; weight: string; reps: string | number; date: string }> {
  const exerciseRecords = new Map<
    string,
    { weight: number; weightStr: string; reps: string | number; date: string }
  >();

  for (const workout of workouts) {
    for (const exercise of workout.exercises) {
      const name = exercise.name.trim().toLowerCase();
      const weight = parseWeight(exercise.weight);

      if (weight > 0) {
        const existing = exerciseRecords.get(name);
        if (!existing || weight > existing.weight) {
          exerciseRecords.set(name, {
            weight,
            weightStr: exercise.weight || "",
            reps: exercise.reps,
            date: workout.createdAt,
          });
        }
      }
    }
  }

  return Array.from(exerciseRecords.entries())
    .map(([exercise, record]) => ({
      exercise: capitalizeWords(exercise),
      weight: record.weightStr,
      reps: record.reps,
      date: record.date,
    }))
    .sort((a, b) => parseWeight(b.weight) - parseWeight(a.weight))
    .slice(0, 10);
}

/**
 * Group workouts by month
 */
function calculateWorkoutsByMonth(
  workouts: DynamoDBWorkout[]
): Array<{ month: string; count: number }> {
  const monthCounts = new Map<string, number>();

  for (const workout of workouts) {
    const date = new Date(workout.createdAt);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    monthCounts.set(monthKey, (monthCounts.get(monthKey) || 0) + 1);
  }

  return Array.from(monthCounts.entries())
    .map(([month, count]) => ({ month, count }))
    .sort((a, b) => a.month.localeCompare(b.month))
    .slice(-12); // Last 12 months
}

/**
 * Group volume by month
 */
function calculateVolumeByMonth(
  workouts: DynamoDBWorkout[]
): Array<{ month: string; volume: number }> {
  const monthVolume = new Map<string, number>();

  for (const workout of workouts) {
    const date = new Date(workout.createdAt);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;

    let workoutVolume = 0;
    for (const exercise of workout.exercises) {
      const setDetails =
        exercise.setDetails && exercise.setDetails.length > 0
          ? exercise.setDetails
          : Array.from({ length: exercise.sets || 1 }).map(() => ({
              reps: exercise.reps,
              weight: exercise.weight,
            }));

      for (const detail of setDetails) {
        const weight = parseWeight(detail?.weight ?? exercise.weight);
        const reps = parseReps(detail?.reps ?? exercise.reps);
        if (weight > 0 && reps > 0) {
          workoutVolume += weight * reps;
        }
      }
    }

    monthVolume.set(monthKey, (monthVolume.get(monthKey) || 0) + workoutVolume);
  }

  return Array.from(monthVolume.entries())
    .map(([month, volume]) => ({ month, volume: Math.round(volume) }))
    .sort((a, b) => a.month.localeCompare(b.month))
    .slice(-12); // Last 12 months
}

/**
 * Parse weight string to number (handles "185 lbs", "80kg", etc.)
 */
function parseWeight(weight: string | number | null | undefined): number {
  if (!weight) return 0;
  const match = weight.toString().match(/[\d.]+/);
  return match ? parseFloat(match[0]) : 0;
}

/**
 * Parse reps (handles ranges like "8-12")
 */
function parseReps(reps: string | number | null | undefined): number {
  if (!reps) return 0;
  if (typeof reps === "number") return reps;
  const match = reps.toString().match(/\d+/);
  return match ? parseInt(match[0]) : 0;
}

/**
 * Capitalize first letter of each word
 */
function capitalizeWords(str: string): string {
  return str
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}
