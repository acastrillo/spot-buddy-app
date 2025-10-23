/**
 * AI Workout Enhancement API
 *
 * POST /api/ai/enhance-workout
 *
 * Takes a workout and uses AI to:
 * - Clean up formatting
 * - Add missing details (rest times, tempo, form cues)
 * - Suggest alternatives for exercises
 * - Optimize exercise order
 * - Add personalized notes based on user's training profile
 */
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { dynamoDBUsers, dynamoDBWorkouts, DynamoDBWorkout } from '@/lib/dynamodb';
import { invokeClaude, estimateCost } from '@/lib/ai/bedrock-client';
import { getAISystemPrompt } from '@/lib/ai/profile-context';
import { getAIRequestLimit } from '@/lib/subscription-tiers';

interface EnhanceWorkoutRequest {
  workoutId: string;
  enhancementType?: 'full' | 'format' | 'details' | 'optimize';
}

interface EnhanceWorkoutResponse {
  success: boolean;
  enhancedWorkout?: DynamoDBWorkout;
  cost?: {
    inputTokens: number;
    outputTokens: number;
    estimatedCost: number;
  };
  quotaRemaining?: number;
  error?: string;
}

export async function POST(req: NextRequest): Promise<NextResponse<EnhanceWorkoutResponse>> {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const userId = (session.user as any).id;
    const body: EnhanceWorkoutRequest = await req.json();
    const { workoutId, enhancementType = 'full' } = body;

    if (!workoutId) {
      return NextResponse.json(
        { success: false, error: 'workoutId is required' },
        { status: 400 }
      );
    }

    // Get user and check AI quota
    const user = await dynamoDBUsers.get(userId);
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    const tier = user.subscriptionTier || 'free';
    const aiLimit = getAIRequestLimit(tier);
    const aiUsed = user.aiRequestsUsed || 0;

    // Check if user has AI quota remaining
    if (aiUsed >= aiLimit) {
      return NextResponse.json(
        {
          success: false,
          error: `You've reached your AI request limit (${aiLimit}/month). Upgrade to continue.`,
          quotaRemaining: 0,
        },
        { status: 403 }
      );
    }

    // Get the workout
    const workout = await dynamoDBWorkouts.get(userId, workoutId);
    if (!workout) {
      return NextResponse.json(
        { success: false, error: 'Workout not found' },
        { status: 404 }
      );
    }

    // Build AI system prompt with user context
    const systemPrompt = await getAISystemPrompt(userId, user);

    // Build user prompt based on enhancement type
    const userPrompt = buildEnhancementPrompt(workout, enhancementType);

    console.log('[AI Enhance] Calling Claude Sonnet 4.5...');
    console.log('[AI Enhance] Enhancement type:', enhancementType);
    console.log('[AI Enhance] Quota remaining:', aiLimit - aiUsed);

    // Call Bedrock
    const response = await invokeClaude(
      [{ role: 'user', content: userPrompt }],
      {
        systemPrompt,
        temperature: 0.7,
        maxTokens: 4096,
      }
    );

    // Parse the enhanced workout from AI response
    const enhancedWorkout = parseAIResponse(workout, response.content);

    // Update the workout in DynamoDB
    await dynamoDBWorkouts.update(userId, workoutId, enhancedWorkout);

    // Increment AI usage counter
    await dynamoDBUsers.incrementAIUsage(userId);

    // Calculate cost
    const cost = estimateCost(response.usage.inputTokens, response.usage.outputTokens);

    console.log('[AI Enhance] Success!');
    console.log('[AI Enhance] Tokens:', response.usage);
    console.log('[AI Enhance] Estimated cost:', cost);

    return NextResponse.json({
      success: true,
      enhancedWorkout: { ...workout, ...enhancedWorkout },
      cost: {
        inputTokens: response.usage.inputTokens,
        outputTokens: response.usage.outputTokens,
        estimatedCost: cost,
      },
      quotaRemaining: aiLimit - aiUsed - 1,
    });
  } catch (error) {
    console.error('[AI Enhance] Error:', error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to enhance workout',
      },
      { status: 500 }
    );
  }
}

/**
 * Build the enhancement prompt based on type
 */
function buildEnhancementPrompt(workout: DynamoDBWorkout, type: string): string {
  const workoutJson = JSON.stringify(
    {
      title: workout.title,
      description: workout.description,
      exercises: workout.exercises,
      muscleGroups: workout.muscleGroups,
      difficulty: workout.difficulty,
    },
    null,
    2
  );

  const basePrompt = `I have the following workout that needs enhancement:\n\n${workoutJson}`;

  switch (type) {
    case 'format':
      return `${basePrompt}

Please clean up the formatting and structure of this workout. Ensure:
- Consistent naming for exercises
- Proper capitalization
- Clear set/rep notation
- Organized muscle group tags

Return ONLY a valid JSON object with the enhanced workout data (same structure as input).`;

    case 'details':
      return `${basePrompt}

Please add missing details to this workout:
- Rest times between sets (30-90s for hypertrophy, 2-5min for strength)
- Tempo notation where helpful (e.g., "3-1-1-0")
- Form cues for key exercises
- Equipment needed
- Any helpful notes about exercise execution

Return ONLY a valid JSON object with the enhanced workout data (same structure as input, but add 'notes' field to exercises if needed).`;

    case 'optimize':
      return `${basePrompt}

Please optimize this workout:
- Suggest better exercise order (compounds first, isolations last)
- Balance muscle group coverage
- Suggest alternative exercises if equipment is limited
- Add warm-up and cool-down recommendations
- Ensure appropriate volume for the difficulty level

Return ONLY a valid JSON object with the enhanced workout data (same structure as input).`;

    case 'full':
    default:
      return `${basePrompt}

Please provide a comprehensive enhancement of this workout:
1. Clean up formatting and exercise names
2. Add missing details (rest times, tempo, form cues)
3. Optimize exercise order and selection
4. Add personalized notes based on my training profile
5. Suggest modifications for my experience level
6. Add warm-up/cool-down if missing

Return ONLY a valid JSON object with the enhanced workout data. Include these fields:
- title (string)
- description (string, enhanced with AI insights)
- exercises (array of objects with: name, sets, reps, weight, restSeconds, notes)
- muscleGroups (array of strings)
- difficulty (string: beginner/intermediate/advanced)
- aiEnhanced (boolean: true)
- aiNotes (string: summary of AI enhancements made)`;
  }
}

/**
 * Parse AI response and extract enhanced workout data
 */
function parseAIResponse(originalWorkout: DynamoDBWorkout, aiResponse: string): Partial<DynamoDBWorkout> {
  try {
    // Try to extract JSON from the response
    const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON found in AI response');
    }

    const enhanced = JSON.parse(jsonMatch[0]);

    // Merge with original workout, preserving IDs and metadata
    return {
      title: enhanced.title || originalWorkout.title,
      description: enhanced.description || originalWorkout.description,
      exercises: enhanced.exercises || originalWorkout.exercises,
      muscleGroups: enhanced.muscleGroups || originalWorkout.muscleGroups,
      difficulty: enhanced.difficulty || originalWorkout.difficulty,
      aiEnhanced: true,
      aiNotes: enhanced.aiNotes || 'Enhanced by AI',
      updatedAt: new Date().toISOString(),
    };
  } catch (error) {
    console.error('[AI Enhance] Error parsing AI response:', error);
    console.error('[AI Enhance] Raw response:', aiResponse);

    // Fallback: just add AI notes to description
    return {
      description: `${originalWorkout.description}\n\n--- AI Enhancement Notes ---\n${aiResponse}`,
      aiEnhanced: true,
      updatedAt: new Date().toISOString(),
    };
  }
}
