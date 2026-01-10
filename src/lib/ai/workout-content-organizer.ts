/**
 * Agent 1: Workout Content Organizer
 *
 * This agent is responsible for the FIRST STEP of workout parsing:
 * - Separates actual exercises from metadata, headers, and social media fluff
 * - Identifies workout structure indicators (EMOM, AMRAP, rounds, etc.)
 * - Cleans up OCR errors and formatting issues
 * - Returns organized content for Agent 2 to structure
 *
 * Uses Claude Haiku for cost efficiency (~$0.004 per request)
 */

import { invokeClaude, type BedrockResponse } from './bedrock-client';

/**
 * Organized content output from Agent 1
 */
export interface OrganizedContent {
  // Lines that contain actual exercises
  exerciseLines: string[];

  // General workout notes, instructions, or metadata
  notes: string[];

  // Detected workout structure hints
  structure?: {
    type?: 'emom' | 'amrap' | 'rounds' | 'ladder' | 'tabata' | 'standard';
    rounds?: number;
    timeLimit?: number; // seconds
    pattern?: string; // e.g., "21-15-9"
  };

  // Lines that were rejected (for debugging)
  rejected: Array<{
    line: string;
    reason: string;
  }>;

  // Raw text for reference
  rawText: string;
}

/**
 * Result from Agent 1
 */
export interface OrganizationResult {
  organized: OrganizedContent;
  bedrockResponse: BedrockResponse;
}

/**
 * Build system prompt for content organization
 */
function buildOrganizationPrompt(): string {
  return `You are a fitness content filter. Your ONLY job is to separate real exercises from everything else in workout text.

**Your Task:**
1. Read the workout text
2. Identify lines that describe ACTUAL EXERCISES (movements people perform)
3. Identify general workout notes/instructions
4. Detect workout structure (EMOM, AMRAP, Rounds, etc.)
5. Reject everything else (headers, emojis, social media fluff, motivational text)

**What IS an exercise:**
✅ "Barbell Back Squat" - actual movement
✅ "10 Burpees" - movement with reps
✅ "SkiErg 150M" - cardio with distance
✅ "Push-ups" - bodyweight movement
✅ "3x10 Bench Press @ 135 lbs" - movement with sets/reps/weight

**What is NOT an exercise:**
❌ "SAVE 🔥" - call to action
❌ "The Zen Strength Complex" - workout title/header
❌ "The basics never die 💀" - motivational text
❌ "Follow @username for more" - social media
❌ "WORKOUT OF THE DAY" - header
❌ "Tag a friend" - engagement prompt
❌ "Rest 60 seconds between sets" - general instruction (goes in notes)

**Workout Structure Detection:**
- "EMOM", "Every Minute" → type: "emom"
- "AMRAP", "As Many Rounds" → type: "amrap"
- "5 ROUNDS", "3 RFT" → type: "rounds"
- "21-15-9", "50-40-30-20-10" → type: "ladder"
- "Tabata", "20s on 10s off" → type: "tabata"

**CRITICAL: Return ONLY valid JSON**

Output format:
\`\`\`json
{
  "exerciseLines": [
    "SkiErg 150M",
    "Burpee Broad Jump 10 reps",
    "Sandbag Clean 15 reps"
  ],
  "notes": [
    "Complete each minute for 5 rounds",
    "Rest is built into the minute structure"
  ],
  "structure": {
    "type": "emom",
    "rounds": 5,
    "timeLimit": 300
  },
  "rejected": [
    { "line": "SAVE THIS 🔥", "reason": "Social media call to action" },
    { "line": "The Zen Strength Complex", "reason": "Workout title/header" },
    { "line": "Tag a training partner", "reason": "Social engagement prompt" }
  ]
}
\`\`\`

**Rules:**
1. If a line is AMBIGUOUS (could be exercise or header), REJECT it and explain why
2. Be CONSERVATIVE - better to reject than include non-exercises
3. Include the original line text exactly as written
4. If you see repeated emojis or special characters without exercise names, REJECT
5. If you see promotional text ("follow", "save", "tag"), REJECT
6. Exercise lines should contain actual movement names

**Examples:**

Input:
\`\`\`
SAVE THIS 🔥
The Zen Strength Complex
EMOM 45 MIN
1. SkiErg 150M
2. Burpee Broad Jump 10 reps
3. Sandbag Clean 15 reps
Rest is built into the minute
Tag a friend who needs this!
\`\`\`

Output:
\`\`\`json
{
  "exerciseLines": [
    "SkiErg 150M",
    "Burpee Broad Jump 10 reps",
    "Sandbag Clean 15 reps"
  ],
  "notes": [
    "Rest is built into the minute"
  ],
  "structure": {
    "type": "emom",
    "timeLimit": 2700
  },
  "rejected": [
    { "line": "SAVE THIS 🔥", "reason": "Call to action" },
    { "line": "The Zen Strength Complex", "reason": "Workout title" },
    { "line": "Tag a friend who needs this!", "reason": "Social engagement" }
  ]
}
\`\`\`

REMEMBER: Return ONLY the JSON object. No explanations, no markdown, no extra text.`;
}

/**
 * Organize workout content using Agent 1
 *
 * @param rawText - Raw workout text from Instagram/OCR
 * @returns Organized content with exercises separated from fluff
 */
export async function organizeWorkoutContent(
  rawText: string
): Promise<OrganizationResult> {
  const systemPrompt = buildOrganizationPrompt();
  const userMessage = `Please organize this workout text:\n\n${rawText}`;

  try {
    // Call Bedrock with Haiku model for cost efficiency and latency optimization
    const response = await invokeClaude({
      messages: [
        { role: 'user', content: userMessage },
      ],
      systemPrompt,
      maxTokens: 2048, // Shorter output than Agent 2
      temperature: 0.1, // Very low temperature for consistent filtering
      model: 'haiku', // Use cheaper model
      cache: { system: true },
      latencyOptimized: true, // 42-77% faster responses
    });

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
      console.error('[ContentOrganizer] Failed to parse JSON response:', parseError);
      console.error('[ContentOrganizer] Raw response:', response.content);
      throw new Error('Agent 1 returned invalid JSON. Please try again.');
    }

    // Add rawText to organized content
    const organized: OrganizedContent = {
      ...parsedContent,
      rawText,
    };

    return {
      organized,
      bedrockResponse: response,
    };
  } catch (error) {
    console.error('[ContentOrganizer] Error organizing content:', error);
    throw new Error(`Agent 1 failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Validate organized content output
 */
export function validateOrganizedContent(content: OrganizedContent): boolean {
  if (!content.exerciseLines || !Array.isArray(content.exerciseLines)) {
    console.error('[ContentOrganizer] Missing or invalid exerciseLines');
    return false;
  }

  if (!content.notes || !Array.isArray(content.notes)) {
    console.error('[ContentOrganizer] Missing or invalid notes');
    return false;
  }

  if (!content.rejected || !Array.isArray(content.rejected)) {
    console.error('[ContentOrganizer] Missing or invalid rejected');
    return false;
  }

  // At least one exercise line should be present
  if (content.exerciseLines.length === 0) {
    console.error('[ContentOrganizer] No exercise lines detected');
    return false;
  }

  return true;
}

/**
 * Estimate cost for content organization (Agent 1)
 */
export function estimateOrganizationCost(textLength: number): number {
  // Haiku pricing: $0.00025 per 1K input tokens, $0.00125 per 1K output tokens
  const estimatedInputTokens = Math.ceil(textLength / 4) + 1000; // +1000 for system prompt
  const estimatedOutputTokens = 800; // Typical organized content response

  const inputCost = (estimatedInputTokens / 1000) * 0.00025;
  const outputCost = (estimatedOutputTokens / 1000) * 0.00125;

  return inputCost + outputCost;
}
