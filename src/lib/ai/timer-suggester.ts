/**
 * AI Timer Suggester Agent
 *
 * Analyzes workout structure and suggests appropriate timer configurations.
 * Uses Claude Haiku for fast, cost-effective timer recommendations.
 */

import type { TimerParams } from '@/timers';
import { invokeClaude, type BedrockResponse } from './bedrock-client';

// ============================================================================
// Types
// ============================================================================

/**
 * Timer suggestion from AI agent
 */
export interface TimerSuggestion {
  workoutStyle: 'hyrox' | 'metcon' | 'strength' | 'endurance' | 'recovery' | 'mixed' | 'unknown';
  primaryGoal: 'conditioning' | 'strength' | 'hypertrophy' | 'mobility' | 'skill' | 'mixed' | 'unknown';
  suggestedTimer: {
    type: 'EMOM' | 'AMRAP' | 'INTERVAL_WORK_REST' | 'TABATA';
    reason: string;
    params: TimerParams;
  } | null;
}

/**
 * Workout data for timer suggestion
 */
export interface WorkoutForTimerSuggestion {
  title?: string;
  description?: string;
  workoutType?: string;
  structure?: {
    type?: string;
    blocks?: any[];
  };
  exercises?: Array<{
    name: string;
    sets?: number;
    reps?: string | number;
    restSeconds?: number;
    notes?: string;
  }>;
  totalDuration?: number;
  difficulty?: string;
}

/**
 * Timer suggester result
 */
export interface TimerSuggesterResult {
  suggestion: TimerSuggestion;
  bedrockResponse: BedrockResponse;
}

// ============================================================================
// Prompts
// ============================================================================

const TIMER_SUGGESTER_PROMPT = `You are Spot Buddy's Workout Timer Agent.

Your job:
- Analyze the workout data provided.
- Infer the workout style and primary goal.
- Decide whether to recommend a workout timer (EMOM, AMRAP, intervals, or Tabata).
- Output a JSON object that follows the exact structure described below.

Workout styles (workoutStyle):
- "hyrox"       → Hyrox-style stations, sleds, runs, wall balls, ski erg, rower.
- "metcon"      → CrossFit / bootcamp style mixed-modal conditioning.
- "strength"    → Heavy lifting, sets and reps, long rests.
- "endurance"   → Long runs, rows, rides, distance emphasis.
- "recovery"    → Mobility, stretching, breathing.
- "mixed"       → A blend of multiple styles.
- "unknown"     → Not clear from the data.

Primary goals (primaryGoal):
- "conditioning" → Cardiovascular endurance and metabolic conditioning
- "strength"     → Maximal strength development
- "hypertrophy"  → Muscle growth
- "mobility"     → Flexibility and range of motion
- "skill"        → Technical skill development
- "mixed"        → Multiple goals
- "unknown"      → Not clear from the data

Timer types you can choose from (suggestedTimer.type):
Only suggest these 4 timer types that are currently supported:

1. "INTERVAL_WORK_REST" - Alternating work and rest periods for specified rounds
   - Best for: Circuit training, HIIT, boot camp style workouts
   - Required params:
     {
       "kind": "INTERVAL_WORK_REST",
       "workSeconds": <integer>,     // Typical: 30-60 seconds
       "restSeconds": <integer>,     // Typical: 10-30 seconds
       "totalRounds": <integer>,     // Typical: 8-12 rounds
       "prepSeconds": <integer>      // Optional prep time, typical: 10 seconds
     }

2. "EMOM" - Every Minute On the Minute
   - Best for: Fixed time intervals with work + rest within each minute
   - Required params:
     {
       "kind": "EMOM",
       "intervalSeconds": <integer>,   // Always 60 for EMOM
       "totalMinutes": <integer>       // Typical: 10-30 minutes
     }

3. "AMRAP" - As Many Rounds As Possible within time limit
   - Best for: Maximum volume in fixed time, density work
   - Required params:
     {
       "kind": "AMRAP",
       "durationSeconds": <integer>   // Typical: 300-1200 (5-20 minutes)
     }

4. "TABATA" - High-intensity intervals (typically 20s work, 10s rest)
   - Best for: Short, intense bursts with brief rest
   - Required params:
     {
       "kind": "TABATA",
       "workSeconds": <integer>,      // Typical: 20 seconds
       "restSeconds": <integer>,      // Typical: 10 seconds
       "rounds": <integer>,           // Typical: 8 rounds
       "prepSeconds": <integer>       // Optional prep time, typical: 10 seconds
     }

Selection guidelines:
- Hyrox / metcon with multiple stations → EMOM, AMRAP, or INTERVAL_WORK_REST
- High-intensity circuits → TABATA or INTERVAL_WORK_REST
- Timed density work → AMRAP
- Fixed work intervals → EMOM
- Traditional strength training → Usually no timer needed (return null)
- Long endurance work → Usually no timer needed (return null)

If no timer is appropriate (e.g., pure strength training with long rest periods), set "suggestedTimer" to null.

You MUST output valid JSON ONLY in this exact format:

{
  "workoutStyle": "<one of: hyrox | metcon | strength | endurance | recovery | mixed | unknown>",
  "primaryGoal": "<one of: conditioning | strength | hypertrophy | mobility | skill | mixed | unknown>",
  "suggestedTimer": {
    "type": "<one of: INTERVAL_WORK_REST | EMOM | AMRAP | TABATA>",
    "reason": "<Short natural language explanation (1-2 sentences) of why this timer matches the workout>",
    "params": { ...one of the timer param schemas above... }
  }
}

OR if no timer fits:

{
  "workoutStyle": "<style>",
  "primaryGoal": "<goal>",
  "suggestedTimer": null
}

Respond with JSON only, no additional text or markdown formatting.`;

// ============================================================================
// Timer Suggester Function
// ============================================================================

/**
 * Suggest timer configuration for a workout using AI
 */
export async function suggestTimerForWorkout(
  workout: WorkoutForTimerSuggestion
): Promise<TimerSuggesterResult> {
  // Format workout data for the AI
  const workoutSummary = {
    title: workout.title,
    description: workout.description,
    workoutType: workout.workoutType,
    structure: workout.structure,
    exerciseCount: workout.exercises?.length || 0,
    exercises: workout.exercises?.slice(0, 10).map((ex) => ({
      name: ex.name,
      sets: ex.sets,
      reps: ex.reps,
      restSeconds: ex.restSeconds,
    })),
    totalDuration: workout.totalDuration,
    difficulty: workout.difficulty,
  };

  const userPrompt = `Analyze this workout and suggest an appropriate timer configuration:\n\n${JSON.stringify(workoutSummary, null, 2)}`;

  // Call Bedrock with Haiku (fast and cheap for this task)
  const bedrockResponse = await invokeClaude({
    systemPrompt: TIMER_SUGGESTER_PROMPT,
    messages: [
      { role: 'user', content: userPrompt },
    ],
    model: 'haiku',
    maxTokens: 1000,
    cache: { system: true },
  });

  // Parse the JSON response
  let suggestion: TimerSuggestion;
  try {
    const cleaned = bedrockResponse.content.trim();
    suggestion = JSON.parse(cleaned) as TimerSuggestion;
  } catch (error) {
    console.error('[Timer Suggester] Parse error:', error);
    console.error('[Timer Suggester] Failed to parse AI response:', bedrockResponse.content);
    throw new Error('Invalid JSON response from timer suggester agent');
  }

  // Validate the suggestion
  if (!validateTimerSuggestion(suggestion)) {
    console.error('[Timer Suggester] Invalid suggestion structure:', suggestion);
    throw new Error('Invalid timer suggestion structure from AI');
  }

  return {
    suggestion,
    bedrockResponse,
  };
}

/**
 * Validate timer suggestion structure
 */
function validateTimerSuggestion(suggestion: any): suggestion is TimerSuggestion {
  if (!suggestion || typeof suggestion !== 'object') {
    return false;
  }

  // Check required fields
  if (!suggestion.workoutStyle || !suggestion.primaryGoal) {
    return false;
  }

  // If suggestedTimer is null, that's valid
  if (suggestion.suggestedTimer === null) {
    return true;
  }

  // If suggestedTimer exists, validate its structure
  const timer = suggestion.suggestedTimer;
  if (!timer || typeof timer !== 'object') {
    return false;
  }

  if (!timer.type || !timer.reason || !timer.params) {
    return false;
  }

  // Validate params have the required 'kind' field
  if (!timer.params.kind) {
    return false;
  }

  return true;
}

/**
 * Estimate cost for timer suggestion
 * Uses Haiku model (~1000 input tokens, ~500 output tokens)
 */
export function estimateTimerSuggestionCost(): number {
  // Haiku costs (as of 2024):
  // Input: $0.25 per 1M tokens
  // Output: $1.25 per 1M tokens
  const inputTokens = 1000;
  const outputTokens = 500;
  const inputCost = (inputTokens / 1_000_000) * 0.25;
  const outputCost = (outputTokens / 1_000_000) * 1.25;
  return inputCost + outputCost; // ~$0.00088
}
