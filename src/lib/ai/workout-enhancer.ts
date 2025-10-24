/**
 * Smart Workout Parser - AI-Powered Workout Enhancement
 *
 * This module provides AI enhancement for messy workout text from OCR or social media imports.
 * It cleans up text, standardizes exercise names, suggests weights based on PRs, and adds form cues.
 *
 * Features:
 * - Clean up messy OCR text
 * - Standardize exercise names
 * - Suggest weights based on user PRs
 * - Add form cues and safety tips
 * - Parse unstructured workout descriptions
 *
 * Usage:
 * 1. User imports workout via OCR or Instagram
 * 2. User clicks "Enhance with AI" button
 * 3. AI processes the workout and returns enhanced version
 * 4. User reviews and saves enhanced workout
 */

import { invokeClaude, logUsage, type BedrockResponse } from './bedrock-client';

/**
 * Workout data structure (matches existing workout type)
 */
export interface WorkoutData {
  title?: string;
  description?: string;
  exercises?: Array<{
    name: string;
    sets?: number;
    reps?: number | string;
    weight?: number | string;
    unit?: 'kg' | 'lbs';
    notes?: string;
  }>;
  tags?: string[];
  difficulty?: 'beginner' | 'intermediate' | 'advanced';
  duration?: number;
}

/**
 * User training context for personalized suggestions
 */
export interface TrainingContext {
  userId: string;
  personalRecords?: Record<string, { weight: number; reps: number; unit: 'kg' | 'lbs' }>;
  experience?: 'beginner' | 'intermediate' | 'advanced';
  equipment?: string[];
  goals?: string[];
}

/**
 * Enhancement result
 */
export interface EnhancementResult {
  enhancedWorkout: WorkoutData;
  changes: string[];
  suggestions: string[];
  bedrockResponse: BedrockResponse;
}

/**
 * Build system prompt for workout enhancement
 */
function buildEnhancementSystemPrompt(context?: TrainingContext): string {
  let prompt = `You are an expert fitness coach and workout parser. Your job is to clean up and enhance workout data.

**Your responsibilities:**
1. **Clean up text**: Fix OCR errors, typos, and formatting issues
2. **Standardize exercise names**: Use proper, consistent exercise names (e.g., "bench press" not "benchpress" or "BP")
3. **Structure data**: Parse unstructured text into structured workout format
4. **Add form cues**: Provide brief, helpful form tips for each exercise
5. **Suggest weights**: Based on user PRs, suggest appropriate weights (if available)
6. **Safety tips**: Add safety notes for complex or dangerous movements

**Output format:**
Return a JSON object with this structure:
\`\`\`json
{
  "title": "Workout Title",
  "description": "Brief description of the workout",
  "exercises": [
    {
      "name": "Exercise Name (standardized)",
      "sets": 4,
      "reps": "8-10" or 12,
      "weight": 135,
      "unit": "lbs" or "kg",
      "notes": "Form cue: Keep back straight. Suggested weight based on your PR."
    }
  ],
  "tags": ["chest", "push", "strength"],
  "difficulty": "intermediate",
  "duration": 45,
  "changes": [
    "Standardized 'benchpress' to 'bench press'",
    "Added form cue for deadlift",
    "Suggested weight of 185 lbs based on your 1RM of 225 lbs"
  ],
  "suggestions": [
    "Consider adding warm-up sets",
    "Rest 2-3 minutes between heavy compound sets"
  ]
}
\`\`\`

**Important guidelines:**
- Preserve the user's original intent and workout structure
- Don't add exercises that weren't in the original text
- If weight/reps are unclear, use ranges (e.g., "8-12 reps", "working weight")
- For bodyweight exercises, omit weight field
- Use standard muscle group tags: chest, back, shoulders, arms, legs, core, cardio, full-body`;

  // Add user context if available
  if (context) {
    if (context.personalRecords && Object.keys(context.personalRecords).length > 0) {
      prompt += `\n\n**User's Personal Records:**\n`;
      for (const [exercise, pr] of Object.entries(context.personalRecords)) {
        prompt += `- ${exercise}: ${pr.weight} ${pr.unit} for ${pr.reps} reps\n`;
      }
      prompt += `\nUse these PRs to suggest appropriate working weights (typically 70-85% of 1RM).`;
    }

    if (context.experience) {
      prompt += `\n\n**User experience level:** ${context.experience}`;
      prompt += `\nAdjust suggestions based on this experience level.`;
    }

    if (context.equipment && context.equipment.length > 0) {
      prompt += `\n\n**Available equipment:** ${context.equipment.join(', ')}`;
      prompt += `\nOnly suggest exercises using available equipment.`;
    }

    if (context.goals && context.goals.length > 0) {
      prompt += `\n\n**Training goals:** ${context.goals.join(', ')}`;
    }
  }

  return prompt;
}

/**
 * Enhance workout using AI
 *
 * @param rawText - Raw workout text from OCR or social import
 * @param context - User training context for personalization
 * @returns Enhanced workout with AI improvements
 */
export async function enhanceWorkout(
  rawText: string,
  context?: TrainingContext
): Promise<EnhancementResult> {
  // Build prompt
  const systemPrompt = buildEnhancementSystemPrompt(context);
  const userMessage = `Please enhance this workout:\n\n${rawText}`;

  try {
    // Call Bedrock
    const response = await invokeClaude({
      messages: [
        { role: 'user', content: userMessage },
      ],
      systemPrompt,
      maxTokens: 4096,
      temperature: 0.3, // Lower temperature for more consistent parsing
    });

    // Log usage
    if (context?.userId) {
      logUsage('workout-enhancement', context.userId, response);
    }

    // Parse JSON response
    let parsedContent;
    try {
      // Try to extract JSON if it's wrapped in markdown code blocks
      const jsonMatch = response.content.match(/```json\n([\s\S]*?)\n```/);
      const jsonText = jsonMatch ? jsonMatch[1] : response.content;
      parsedContent = JSON.parse(jsonText);
    } catch (parseError) {
      console.error('[WorkoutEnhancer] Failed to parse JSON response:', parseError);
      throw new Error('AI returned invalid JSON. Please try again.');
    }

    // Extract workout data and metadata
    const { changes = [], suggestions = [], ...workoutData } = parsedContent;

    return {
      enhancedWorkout: workoutData as WorkoutData,
      changes,
      suggestions,
      bedrockResponse: response,
    };
  } catch (error) {
    console.error('[WorkoutEnhancer] Error enhancing workout:', error);
    throw new Error(`Failed to enhance workout: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Enhance workout with streaming (for real-time UI updates)
 *
 * NOTE: This function returns the raw JSON string incrementally.
 * The client should accumulate chunks and parse JSON only when complete.
 *
 * @param rawText - Raw workout text
 * @param context - User training context
 * @param onChunk - Callback for each text chunk
 * @returns Final enhanced workout
 */
export async function enhanceWorkoutStream(
  rawText: string,
  context: TrainingContext | undefined,
  onChunk: (chunk: string) => void
): Promise<EnhancementResult> {
  // For now, we'll use non-streaming since JSON parsing is complex with streaming
  // In the future, we could implement a custom JSON stream parser
  return enhanceWorkout(rawText, context);
}

/**
 * Quick validation of enhanced workout
 *
 * @param workout - Enhanced workout data
 * @returns true if workout looks valid
 */
export function validateEnhancedWorkout(workout: WorkoutData): boolean {
  // Basic validation
  if (!workout.title || typeof workout.title !== 'string') return false;
  if (!workout.exercises || !Array.isArray(workout.exercises)) return false;
  if (workout.exercises.length === 0) return false;

  // Validate each exercise
  for (const exercise of workout.exercises) {
    if (!exercise.name || typeof exercise.name !== 'string') return false;
    // Sets/reps are optional, but if present should be valid
    if (exercise.sets !== undefined && (typeof exercise.sets !== 'number' || exercise.sets < 1)) return false;
  }

  return true;
}

/**
 * Estimate cost for workout enhancement
 *
 * @param textLength - Length of raw workout text
 * @returns Estimated cost in USD
 */
export function estimateEnhancementCost(textLength: number): number {
  // Rough token estimate: ~1 token per 4 characters
  const estimatedInputTokens = Math.ceil(textLength / 4) + 500; // +500 for system prompt
  const estimatedOutputTokens = 1500; // Typical enhanced workout response

  const inputCost = estimatedInputTokens * 0.000003;
  const outputCost = estimatedOutputTokens * 0.000015;

  return inputCost + outputCost;
}
