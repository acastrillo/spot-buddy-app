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
import {
  matchExercise,
  detectWorkoutFormat,
  parseWorkoutStructure,
  generateExerciseContext,
  suggestExercises,
} from '../knowledge-base/exercise-matcher';
import type { OrganizedContent } from './workout-content-organizer';

/**
 * Workout data structure (aligned with table and DynamoDB format)
 */
export interface WorkoutData {
  title?: string;
  description?: string;
  workoutType?: 'standard' | 'emom' | 'amrap' | 'rounds' | 'ladder' | 'tabata';
  structure?: {
    rounds?: number;
    timePerRound?: number; // seconds
    timeLimit?: number; // seconds for AMRAP
    totalTime?: number; // seconds
    pattern?: string; // e.g., "21-15-9" for ladder
  };
  exercises?: Array<{
    name: string;
    sets: number | string; // Flat format: "3" or 3
    reps?: number | string; // "10" or "150M" for distance
    weight?: string; // "135 lbs" or "60 kg"
    duration?: number; // For cardio exercises (in seconds)
    restSeconds?: number;
    notes?: string; // Exercise-specific notes only
  }>;
  aiNotes?: string[]; // AI-generated suggestions, tips, and observations (NOT exercises)
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
  bedrockResponse: BedrockResponse;
}

/**
 * Extract potential exercise names from raw workout text
 * Uses simple heuristics to identify lines that might contain exercises
 */
function extractPotentialExerciseNames(text: string): string[] {
  const lines = text.split('\n').map(line => line.trim()).filter(Boolean);
  const exerciseNames: string[] = [];

  for (const line of lines) {
    // Skip lines that look like headers, times, or metadata
    if (
      /^(workout|title|description|notes|round|time|min|sec|emom|amrap)/i.test(line) ||
      /^\d+:\d+/.test(line) || // Skip timestamps
      line.length < 3 || // Skip very short lines
      /^[A-Z\s]+$/.test(line) && line.split(' ').length > 4 // Skip all-caps headers
    ) {
      continue;
    }

    // Try to extract exercise name from various formats
    // Format: "Exercise Name - 3x10"
    const dashMatch = line.match(/^([A-Za-z\s-]+?)(?:\s*[-:]\s*\d|$)/);
    if (dashMatch) {
      exerciseNames.push(dashMatch[1].trim());
      continue;
    }

    // Format: "10 Push-ups" or "20 Burpees"
    const repsMatch = line.match(/^\d+\s+([A-Za-z\s-]+?)(?:\s*@|\s*\d|$)/);
    if (repsMatch) {
      exerciseNames.push(repsMatch[1].trim());
      continue;
    }

    // Format: "Bench Press 3x10"
    const setsMatch = line.match(/^([A-Za-z\s-]+?)\s+\d+x\d+/);
    if (setsMatch) {
      exerciseNames.push(setsMatch[1].trim());
      continue;
    }

    // If line contains mostly letters and spaces, might be an exercise name
    if (/^[A-Za-z\s-]{3,50}$/.test(line)) {
      exerciseNames.push(line);
    }
  }

  // Return unique names
  return [...new Set(exerciseNames)];
}

/**
 * Build system prompt for workout enhancement
 * Now includes exercise knowledge base context for better recognition
 */
function buildEnhancementSystemPrompt(
  rawText: string,
  context?: TrainingContext
): string {
  let prompt = `You are an expert fitness coach and workout parser. Your job is to clean up and enhance workout data extracted from images or text.

CRITICAL: You must respond with ONLY valid JSON. Do not include any explanatory text, markdown formatting, or commentary. Return ONLY the JSON object.

**Your responsibilities:**
1. **Clean up text**: Fix OCR errors, typos, and formatting issues
2. **Extract ONLY actual exercises**: Ignore headers, UI elements, metadata
3. **Detect workout structure**: Identify EMOM, AMRAP, Rounds, Ladder, Tabata patterns
4. **Standardize exercise names**: Use proper names (e.g., "Bench Press" not "BP")
5. **Preserve distances and reps**: Keep "150M" or "1000M" for runs, don't convert to time
6. **Add form cues**: Provide brief form tips in the notes field (optional)

**CRITICAL: Workout Structure Detection**

**EMOM (Every Minute On the Minute):**
- Pattern: "EMOM" or "Every Minute" in text
- Structure: Multiple exercises done within each minute, repeated for X rounds
- Example: "EMOM 10 MIN" or "5 ROUNDS" with per-minute exercises
- Set workoutType: "emom", structure.rounds = number of rounds/minutes, structure.totalTime = total minutes

**AMRAP (As Many Rounds As Possible):**
- Pattern: "AMRAP" with time limit
- Structure: Complete exercises as many times as possible in time limit
- Example: "AMRAP 20 MIN"
- Set workoutType: "amrap", structure.timeLimit = time in seconds

**Rounds:**
- Pattern: "X ROUNDS" or "X rounds for time"
- Structure: Complete X full rounds of all exercises
- Example: "5 ROUNDS FOR TIME"
- Set workoutType: "rounds", structure.rounds = number

**Ladder:**
- Pattern: Descending/ascending rep schemes like "21-15-9"
- Example: "21-15-9 reps for time"
- Set workoutType: "ladder", structure.pattern = "21-15-9"

**Standard:**
- No special structure, just straight sets
- Set workoutType: "standard"

**CRITICAL: Output Format (FLAT STRUCTURE)**

Return JSON with this EXACT structure:
\`\`\`json
{
  "title": "Workout Title",
  "description": "Brief description",
  "workoutType": "emom",
  "structure": {
    "rounds": 5,
    "timePerRound": 60,
    "totalTime": 2700
  },
  "exercises": [
    {
      "name": "SkiErg",
      "sets": 5,
      "reps": "150M",
      "notes": "Maintain steady pace"
    },
    {
      "name": "Burpee Broad Jump",
      "sets": 5,
      "reps": 10,
      "notes": "Land softly"
    },
    {
      "name": "Dumbbell Squat",
      "sets": 3,
      "reps": 12,
      "weight": "50 lbs",
      "restSeconds": 90,
      "notes": "Keep chest up"
    }
  ],
  "aiNotes": [
    "This is a high-intensity EMOM focusing on cardio and power",
    "Rest periods are built into the minute structure",
    "Maintain consistent pacing throughout all rounds"
  ],
  "tags": ["cardio", "full-body", "emom"],
  "difficulty": "intermediate",
  "duration": 45
}
\`\`\`

**IMPORTANT: Flat Exercise Format**
- "sets": NUMBER (not array) - how many sets total
- "reps": NUMBER or STRING - "10" for reps, "150M" for distance, "30s" for time
- "weight": STRING with unit - "135 lbs" or "60 kg"
- "duration": NUMBER in seconds (for pure cardio like treadmill)
- "restSeconds": NUMBER (optional)
- "notes": STRING (optional exercise-specific form cues ONLY)

**IMPORTANT: AI Notes Field**
- "aiNotes": ARRAY of STRINGS - General workout observations, tips, and suggestions
- Use this for: overall workout advice, pacing tips, safety reminders, training insights
- DO NOT put general observations in exercise.notes (those are for exercise-specific form cues only)
- DO NOT create fake exercises from summary text or observations

**DO NOT include:**
- Nested "sets" arrays
- "changes" or "suggestions" fields
- Metadata as exercises
- Headers or descriptions as exercises
- Summary text as exercises
- Observations as exercises

**Examples:**

**EMOM Workout:**
{
  "title": "HYROX EMOM",
  "workoutType": "emom",
  "structure": { "rounds": 5, "timePerRound": 60, "totalTime": 2700 },
  "exercises": [
    { "name": "SkiErg", "sets": 5, "reps": "150M" },
    { "name": "Burpee Broad Jump", "sets": 5, "reps": 10 },
    { "name": "Sled Push", "sets": 5, "reps": "50M" }
  ],
  "aiNotes": [
    "HYROX-style training focusing on functional movements",
    "Each exercise should be completed within the minute with rest before next round"
  ]
}

**Standard Workout:**
{
  "title": "Upper Body Push",
  "workoutType": "standard",
  "exercises": [
    { "name": "Bench Press", "sets": 3, "reps": 10, "weight": "135 lbs", "restSeconds": 90 },
    { "name": "Overhead Press", "sets": 3, "reps": 8, "weight": "95 lbs", "restSeconds": 90 }
  ],
  "aiNotes": [
    "Focus on pressing movements for chest and shoulders",
    "Ensure proper warm-up before heavy pressing"
  ]
}

**AMRAP Workout:**
{
  "title": "Metcon",
  "workoutType": "amrap",
  "structure": { "timeLimit": 1200 },
  "exercises": [
    { "name": "Pull-ups", "sets": 1, "reps": 10 },
    { "name": "Push-ups", "sets": 1, "reps": 15 },
    { "name": "Air Squats", "sets": 1, "reps": 20 }
  ],
  "aiNotes": [
    "Classic CrossFit triplet focusing on bodyweight movements",
    "Pace yourself to complete as many full rounds as possible"
  ]
}

REMEMBER: Return ONLY the JSON object. No explanations, no markdown code blocks, no additional text. Just pure JSON.`;

  // Add exercise knowledge base context
  // Extract exercise names from raw text for fuzzy matching
  const exerciseNames = extractPotentialExerciseNames(rawText);
  if (exerciseNames.length > 0) {
    const exerciseContext = generateExerciseContext(exerciseNames);
    if (exerciseContext) {
      prompt += exerciseContext;
    }
  }

  // Detect workout format
  const { detectedFormat, metadata } = parseWorkoutStructure(rawText);
  if (detectedFormat) {
    prompt += `\n\n**DETECTED WORKOUT FORMAT:** ${detectedFormat.name} (${detectedFormat.type})`;
    prompt += `\n${detectedFormat.description}`;
    if (Object.keys(metadata).length > 0) {
      prompt += `\nDetected metadata: ${JSON.stringify(metadata)}`;
    }
  }

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
  // Build prompt with exercise knowledge base context
  const systemPrompt = buildEnhancementSystemPrompt(rawText, context);
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
      let jsonText = response.content.trim();

      // Try to extract JSON if it's wrapped in markdown code blocks
      const jsonMatch = jsonText.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
      if (jsonMatch) {
        jsonText = jsonMatch[1].trim();
      }

      // Remove any leading/trailing text that's not JSON
      const firstBrace = jsonText.indexOf('{');
      const lastBrace = jsonText.lastIndexOf('}');
      if (firstBrace !== -1 && lastBrace !== -1) {
        jsonText = jsonText.substring(firstBrace, lastBrace + 1);
      }

      parsedContent = JSON.parse(jsonText);
    } catch (parseError) {
      console.error('[WorkoutEnhancer] Failed to parse JSON response:', parseError);
      console.error('[WorkoutEnhancer] Raw response:', response.content);
      throw new Error('AI returned invalid JSON. Please try again.');
    }

    // AI now returns workout data directly in flat format
    return {
      enhancedWorkout: parsedContent as WorkoutData,
      bedrockResponse: response,
    };
  } catch (error) {
    console.error('[WorkoutEnhancer] Error enhancing workout:', error);
    throw new Error(`Failed to enhance workout: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Agent 2: Structure Workout from Organized Content
 *
 * This is the SECOND STEP of the two-agent workflow.
 * Takes pre-filtered exercise lines from Agent 1 and structures them into a complete workout.
 *
 * @param organized - Organized content from Agent 1
 * @param context - User training context for personalization
 * @returns Structured workout with AI improvements
 */
export async function structureWorkout(
  organized: OrganizedContent,
  context?: TrainingContext
): Promise<EnhancementResult> {
  // Build a focused prompt for Agent 2 using the filtered content
  const systemPrompt = buildStructurePrompt(organized, context);

  // Create focused input from organized content
  const exerciseText = organized.exerciseLines.join('\n');
  const notesText = organized.notes.length > 0 ? `\n\nNotes:\n${organized.notes.join('\n')}` : '';
  const structureHint = organized.structure ? `\n\nDetected structure: ${JSON.stringify(organized.structure)}` : '';

  const userMessage = `Please structure this workout:\n\n${exerciseText}${notesText}${structureHint}`;

  try {
    // Call Bedrock with Sonnet model for better reasoning
    const response = await invokeClaude({
      messages: [
        { role: 'user', content: userMessage },
      ],
      systemPrompt,
      maxTokens: 4096,
      temperature: 0.3,
      model: 'sonnet', // Use Sonnet for better structuring
    });

    // Log usage
    if (context?.userId) {
      logUsage('workout-structuring', context.userId, response);
    }

    // Parse JSON response
    let parsedContent;
    try {
      let jsonText = response.content.trim();

      // Try to extract JSON if it's wrapped in markdown code blocks
      const jsonMatch = jsonText.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
      if (jsonMatch) {
        jsonText = jsonMatch[1].trim();
      }

      // Remove any leading/trailing text that's not JSON
      const firstBrace = jsonText.indexOf('{');
      const lastBrace = jsonText.lastIndexOf('}');
      if (firstBrace !== -1 && lastBrace !== -1) {
        jsonText = jsonText.substring(firstBrace, lastBrace + 1);
      }

      parsedContent = JSON.parse(jsonText);
    } catch (parseError) {
      console.error('[WorkoutStructurer] Failed to parse JSON response:', parseError);
      console.error('[WorkoutStructurer] Raw response:', response.content);
      throw new Error('Agent 2 returned invalid JSON. Please try again.');
    }

    return {
      enhancedWorkout: parsedContent as WorkoutData,
      bedrockResponse: response,
    };
  } catch (error) {
    console.error('[WorkoutStructurer] Error structuring workout:', error);
    throw new Error(`Agent 2 failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Build system prompt for Agent 2 (Workout Structurer)
 */
function buildStructurePrompt(
  organized: OrganizedContent,
  context?: TrainingContext
): string {
  let prompt = `You are an expert fitness coach. Your job is to structure pre-filtered exercise data into a complete workout.

**IMPORTANT:** The exercise lines have already been filtered by another AI. They contain ONLY real exercises.
Your job is NOT to filter - it's to STRUCTURE and ENHANCE.

**Your responsibilities:**
1. **Parse exercise lines**: Extract name, sets, reps, weight from each line
2. **Detect workout structure**: Use the provided structure hints
3. **Standardize exercise names**: Use proper names (e.g., "Bench Press" not "BP")
4. **Add form cues**: Provide brief form tips in notes field
5. **Generate title**: Create an appropriate workout title
6. **Add AI insights**: Provide training tips in aiNotes field

**CRITICAL: Output Format (FLAT STRUCTURE)**

Return JSON with this EXACT structure:
\`\`\`json
{
  "title": "Workout Title",
  "description": "Brief description",
  "workoutType": "emom",
  "structure": {
    "rounds": 5,
    "timePerRound": 60,
    "totalTime": 2700
  },
  "exercises": [
    {
      "name": "SkiErg",
      "sets": 5,
      "reps": "150M",
      "notes": "Maintain steady pace"
    },
    {
      "name": "Burpee Broad Jump",
      "sets": 5,
      "reps": 10,
      "notes": "Land softly"
    }
  ],
  "aiNotes": [
    "This is a high-intensity EMOM focusing on cardio and power",
    "Rest periods are built into the minute structure"
  ],
  "tags": ["cardio", "full-body", "emom"],
  "difficulty": "intermediate",
  "duration": 45
}
\`\`\`

**Exercise Format:**
- "sets": NUMBER - how many sets total
- "reps": NUMBER or STRING - "10" for reps, "150M" for distance, "30s" for time
- "weight": STRING with unit - "135 lbs" or "60 kg" (optional)
- "duration": NUMBER in seconds (optional, for pure cardio)
- "restSeconds": NUMBER (optional)
- "notes": STRING (optional, exercise-specific form cues ONLY)

**AI Notes Field:**
- "aiNotes": ARRAY of STRINGS
- General workout observations, tips, and suggestions
- NOT for exercise-specific notes (use exercise.notes for that)

**Workout Types:**
- "standard" - Regular sets and reps
- "emom" - Every Minute On the Minute
- "amrap" - As Many Rounds As Possible
- "rounds" - X rounds for time
- "ladder" - Descending/ascending reps (e.g., 21-15-9)
- "tabata" - 20s work / 10s rest

REMEMBER: Return ONLY the JSON object. No explanations, no markdown, no extra text.`;

  // Add structure hints from Agent 1
  if (organized.structure) {
    prompt += `\n\n**DETECTED STRUCTURE FROM AGENT 1:**`;
    prompt += `\nType: ${organized.structure.type || 'standard'}`;
    if (organized.structure.rounds) {
      prompt += `\nRounds: ${organized.structure.rounds}`;
    }
    if (organized.structure.timeLimit) {
      prompt += `\nTime Limit: ${organized.structure.timeLimit} seconds`;
    }
    if (organized.structure.pattern) {
      prompt += `\nPattern: ${organized.structure.pattern}`;
    }
    prompt += `\n\nUse these hints to set the correct workoutType and structure fields.`;
  }

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
    }
  }

  return prompt;
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

/**
 * Re-export knowledge base utilities for convenience
 */
export {
  matchExercise,
  detectWorkoutFormat,
  parseWorkoutStructure,
  suggestExercises,
} from '../knowledge-base/exercise-matcher';
