/**
 * AI Workout Generator - Generate Personalized Workouts
 *
 * Takes natural language input and generates complete, personalized workouts
 * based on user's training profile, PRs, equipment, and goals.
 *
 * Example inputs:
 * - "Upper body, dumbbells only, 45 minutes, hypertrophy focus"
 * - "Full body strength workout, 60 minutes"
 * - "Leg day with squats and deadlifts"
 */

import { invokeClaude, logUsage, type BedrockResponse } from './bedrock-client';
import { type TrainingProfile, profileToAIContext } from '../training-profile';
import { type WorkoutData } from './workout-enhancer';

/**
 * Workout generation request
 */
export interface WorkoutGenerationRequest {
  prompt: string; // Natural language description
  trainingProfile?: TrainingProfile;
  userId: string;
}

/**
 * Generated workout result
 */
export interface GeneratedWorkout {
  workout: WorkoutData;
  rationale: string; // Why this workout was generated
  alternatives: string[]; // Alternative exercise suggestions
  bedrockResponse: BedrockResponse;
}

/**
 * Build system prompt for workout generation
 */
function buildGenerationSystemPrompt(profile?: TrainingProfile): string {
  let prompt = `You are an expert personal trainer and workout designer. Your job is to create complete, personalized workout programs based on the user's request.

**Your responsibilities:**
1. **Create comprehensive workouts** with warm-up, main exercises, and cool-down
2. **Personalize based on user profile** (PRs, equipment, goals, experience)
3. **Follow exercise science principles** (compounds first, proper volume, progressive overload)
4. **Suggest appropriate weights** based on user's PRs (70-85% of 1RM)
5. **Respect constraints** (injuries, equipment limitations)
6. **Provide exercise alternatives** for variety

**Workout structure requirements:**
- Warm-up: 5-10 minutes of dynamic stretching and mobility
- Main work: 4-8 exercises (compounds first, isolations last)
- Cool-down: 5-10 minutes of static stretching
- Each exercise: sets, reps, rest times, form cues
- Total duration: Match user's request

**Exercise selection principles:**
- Compound movements first (squat, deadlift, press, row, pull-up)
- Isolation movements last (curls, extensions, raises)
- Balance muscle groups (push/pull, upper/lower)
- Progressive difficulty (harder exercises when fresh)

**Rep ranges by goal:**
- Strength: 3-6 reps @ 85-90% 1RM, 3-5 min rest
- Hypertrophy: 8-12 reps @ 70-80% 1RM, 60-90s rest
- Endurance: 12-20 reps @ 60-70% 1RM, 30-60s rest

**Output format:**
Return a JSON object with this structure:
\`\`\`json
{
  "title": "Workout Title",
  "description": "Brief description of the workout and its focus",
  "duration": 60,
  "difficulty": "intermediate",
  "tags": ["chest", "triceps", "push"],
  "exercises": [
    {
      "name": "Barbell bench press",
      "sets": 4,
      "reps": "6-8",
      "weight": 185,
      "unit": "lbs",
      "restSeconds": 180,
      "notes": "Main compound movement. Form: Arch back, retract scapula, bar touches mid-chest. Suggested weight based on your 225 lbs PR."
    }
  ],
  "warmup": "5 min treadmill, arm circles, band pull-aparts, light bench press sets",
  "cooldown": "Chest stretch, tricep stretch, foam roll",
  "rationale": "This workout focuses on chest and triceps with a strength emphasis. Started with heavy compounds, finished with isolation work for hypertrophy.",
  "alternatives": [
    "Replace bench press with incline press for upper chest focus",
    "Add cable flies for more pump and mind-muscle connection"
  ]
}
\`\`\``;

  // Add user training profile context
  if (profile) {
    prompt += `\n\n${profileToAIContext(profile)}`;

    prompt += `\n\n**Important personalization notes:**`;

    if (profile.personalRecords && Object.keys(profile.personalRecords).length > 0) {
      prompt += `\n- Use the PRs above to suggest appropriate working weights`;
    }

    if (profile.equipment && profile.equipment.length > 0) {
      prompt += `\n- Only use available equipment: ${profile.equipment.join(', ')}`;
    }

    if (profile.goals && profile.goals.length > 0) {
      prompt += `\n- Align workout with goals: ${profile.goals.join(', ')}`;
    }

    if (profile.constraints && profile.constraints.length > 0) {
      prompt += `\n- Respect constraints and avoid contraindicated exercises`;
    }

    if (profile.experience) {
      prompt += `\n- Adjust complexity for ${profile.experience} level`;
    }
  }

  return prompt;
}

/**
 * Generate workout from natural language prompt
 *
 * @param request - Generation request with prompt and profile
 * @returns Complete generated workout
 */
export async function generateWorkout(
  request: WorkoutGenerationRequest
): Promise<GeneratedWorkout> {
  const { prompt, trainingProfile, userId } = request;

  // Build system prompt with user context
  const systemPrompt = buildGenerationSystemPrompt(trainingProfile);

  // Build user message
  const userMessage = `Generate a workout based on this request:\n\n${prompt}`;

  try {
    // Call Bedrock
    const response = await invokeClaude({
      messages: [{ role: 'user', content: userMessage }],
      systemPrompt,
      maxTokens: 4096,
      temperature: 0.7, // Higher temperature for more creative workout variations
    });

    // Log usage
    logUsage('workout-generation', userId, response);

    // Parse JSON response
    let parsedContent;
    try {
      // Try to extract JSON if it's wrapped in markdown code blocks
      const jsonMatch = response.content.match(/```json\n([\s\S]*?)\n```/);
      const jsonText = jsonMatch ? jsonMatch[1] : response.content;
      parsedContent = JSON.parse(jsonText);
    } catch (parseError) {
      console.error('[WorkoutGenerator] Failed to parse JSON response:', parseError);
      throw new Error('AI returned invalid JSON. Please try again.');
    }

    // Extract workout data and metadata
    const { rationale = 'Generated workout', alternatives = [], ...workoutData } = parsedContent;

    return {
      workout: workoutData as WorkoutData,
      rationale,
      alternatives,
      bedrockResponse: response,
    };
  } catch (error) {
    console.error('[WorkoutGenerator] Error generating workout:', error);
    throw new Error(`Failed to generate workout: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Validate generated workout
 */
export function validateGeneratedWorkout(workout: WorkoutData): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  // Basic validation
  if (!workout.title || typeof workout.title !== 'string') {
    errors.push('Workout must have a title');
  }

  if (!workout.exercises || !Array.isArray(workout.exercises) || workout.exercises.length === 0) {
    errors.push('Workout must have at least one exercise');
  }

  // Validate each exercise
  if (workout.exercises) {
    for (const [index, exercise] of workout.exercises.entries()) {
      if (!exercise.name) {
        errors.push(`Exercise ${index + 1} is missing a name`);
      }
      if (!exercise.sets || exercise.sets < 1) {
        errors.push(`Exercise "${exercise.name}" has invalid sets: ${exercise.sets}`);
      }
      if (!exercise.reps) {
        errors.push(`Exercise "${exercise.name}" is missing reps`);
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Estimate cost for workout generation
 *
 * @param promptLength - Length of user prompt
 * @param hasProfile - Whether user profile is included
 * @returns Estimated cost in USD
 */
export function estimateGenerationCost(
  promptLength: number,
  hasProfile: boolean
): number {
  // Rough token estimate
  const promptTokens = Math.ceil(promptLength / 4);
  const systemPromptTokens = hasProfile ? 1000 : 500; // Profile adds context
  const estimatedInputTokens = promptTokens + systemPromptTokens;
  const estimatedOutputTokens = 2500; // Typical full workout response

  const inputCost = estimatedInputTokens * 0.000003;
  const outputCost = estimatedOutputTokens * 0.000015;

  return inputCost + outputCost;
}

/**
 * Generate quick workout suggestions (for UI autocomplete/suggestions)
 */
export const WORKOUT_SUGGESTIONS = [
  'Upper body strength, barbell focus, 60 minutes',
  'Lower body hypertrophy, 45 minutes',
  'Full body workout, 3x per week split',
  'Push day (chest, shoulders, triceps)',
  'Pull day (back, biceps)',
  'Leg day with squats and deadlifts',
  'Home workout, dumbbells only, 30 minutes',
  'Bodyweight workout, no equipment',
  'Core and abs focused session',
  'HIIT workout, 20 minutes',
] as const;
