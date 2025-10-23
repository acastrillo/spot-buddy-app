/**
 * AI Profile Context Builder
 *
 * Builds personalized context for AI requests based on:
 * - User's training profile (goals, preferences, experience)
 * - Personal Records (PRs)
 * - Recent workout history
 * - Body metrics
 *
 * This context is added to AI prompts to provide personalized recommendations
 */
import { DynamoDBUser, dynamoDBWorkouts } from '@/lib/dynamodb';
import { getExerciseHistory } from '@/lib/exercise-history';

export interface AIProfileContext {
  // User profile data
  experienceLevel?: string;
  goals?: string[];
  equipment?: string[];
  constraints?: string;
  preferredDuration?: number;
  trainingFrequency?: number;
  energyLevels?: string;

  // Training data
  recentWorkouts?: {
    date: string;
    title: string;
    exercises: string[];
    muscleGroups: string[];
  }[];
  personalRecords?: {
    exercise: string;
    weight: number;
    reps: number;
    estimatedOneRepMax: number;
  }[];

  // Preferences
  favoriteExercises?: string[];
  dislikedExercises?: string[];
}

/**
 * Build AI context from user data
 */
export async function buildAIProfileContext(
  userId: string,
  user?: DynamoDBUser
): Promise<AIProfileContext> {
  const context: AIProfileContext = {};

  // Add training profile data
  if (user?.trainingProfile) {
    const profile = user.trainingProfile;

    context.experienceLevel = profile.experienceLevel;
    context.goals = profile.goals;
    context.equipment = profile.equipment;
    context.constraints = profile.constraints;
    context.preferredDuration = profile.preferredDuration;
    context.trainingFrequency = profile.trainingFrequency;
    context.energyLevels = profile.energyLevels;
    context.favoriteExercises = profile.favoriteExercises;
    context.dislikedExercises = profile.dislikedExercises;
  }

  try {
    // Get recent workouts (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentWorkouts = await dynamoDBWorkouts.getByDateRange(
      userId,
      thirtyDaysAgo.toISOString().split('T')[0],
      new Date().toISOString().split('T')[0]
    );

    // Extract exercise history and PRs
    const allWorkouts = await dynamoDBWorkouts.list(userId);
    const exerciseHistory = getExerciseHistory(allWorkouts);

    // Format recent workouts for AI context
    context.recentWorkouts = recentWorkouts.slice(0, 10).map((workout) => ({
      date: workout.scheduledDate || workout.createdAt,
      title: workout.title,
      exercises: workout.exercises?.map((ex) => ex.name) || [],
      muscleGroups: workout.muscleGroups || [],
    }));

    // Format PRs for AI context (top 10 by weight)
    context.personalRecords = Object.entries(exerciseHistory)
      .map(([exercise, history]) => {
        const pr = history.personalRecord;
        if (!pr) return null;

        return {
          exercise,
          weight: pr.weight || 0,
          reps: pr.reps || 0,
          estimatedOneRepMax: pr.estimatedOneRepMax || 0,
        };
      })
      .filter((pr): pr is NonNullable<typeof pr> => pr !== null)
      .sort((a, b) => b.estimatedOneRepMax - a.estimatedOneRepMax)
      .slice(0, 10);
  } catch (error) {
    console.error('[AI Context] Error fetching workout data:', error);
    // Continue with partial context if workout data fails
  }

  return context;
}

/**
 * Format context as a string for AI prompts
 */
export function formatContextForPrompt(context: AIProfileContext): string {
  const parts: string[] = [];

  if (context.experienceLevel) {
    parts.push(`Experience Level: ${context.experienceLevel}`);
  }

  if (context.goals && context.goals.length > 0) {
    parts.push(`Goals: ${context.goals.join(', ')}`);
  }

  if (context.equipment && context.equipment.length > 0) {
    parts.push(`Available Equipment: ${context.equipment.join(', ')}`);
  }

  if (context.preferredDuration) {
    parts.push(`Preferred Workout Duration: ${context.preferredDuration} minutes`);
  }

  if (context.trainingFrequency) {
    parts.push(`Training Frequency: ${context.trainingFrequency} days/week`);
  }

  if (context.favoriteExercises && context.favoriteExercises.length > 0) {
    parts.push(`Favorite Exercises: ${context.favoriteExercises.join(', ')}`);
  }

  if (context.dislikedExercises && context.dislikedExercises.length > 0) {
    parts.push(`Avoid These Exercises: ${context.dislikedExercises.join(', ')}`);
  }

  if (context.constraints) {
    parts.push(`Constraints/Limitations: ${context.constraints}`);
  }

  if (context.personalRecords && context.personalRecords.length > 0) {
    const prStrings = context.personalRecords.map(
      (pr) => `${pr.exercise}: ${pr.weight}lbs x ${pr.reps} (Est 1RM: ${pr.estimatedOneRepMax}lbs)`
    );
    parts.push(`Personal Records:\n${prStrings.join('\n')}`);
  }

  if (context.recentWorkouts && context.recentWorkouts.length > 0) {
    const workoutStrings = context.recentWorkouts.map(
      (w) => `- ${w.date}: ${w.title} (${w.muscleGroups.join(', ')})`
    );
    parts.push(`Recent Workouts (Last 30 Days):\n${workoutStrings.join('\n')}`);
  }

  return parts.length > 0 ? parts.join('\n\n') : 'No training profile data available.';
}

/**
 * Get AI context formatted as a system prompt
 */
export async function getAISystemPrompt(
  userId: string,
  user?: DynamoDBUser
): Promise<string> {
  const context = await buildAIProfileContext(userId, user);
  const formattedContext = formatContextForPrompt(context);

  return `You are a professional fitness coach and workout expert. You provide personalized workout recommendations based on the user's profile and training history.

User Profile:
${formattedContext}

Guidelines:
- Tailor recommendations to the user's experience level and goals
- Respect equipment availability and constraints
- Consider recent workout history to avoid overtraining specific muscle groups
- Use PRs to suggest appropriate weights (typically 70-85% of 1RM for hypertrophy)
- Prioritize favorite exercises when possible
- Avoid disliked exercises unless absolutely necessary
- Keep workouts within preferred duration when specified
- Provide clear form cues and safety tips
- Be encouraging and motivating`;
}
