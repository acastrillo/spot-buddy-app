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
import { getAuthenticatedUserId } from '@/lib/api-auth';
import { dynamoDBUsers, dynamoDBWorkouts, DynamoDBWorkout } from '@/lib/dynamodb';
import { enhanceWorkout, estimateEnhancementCost, type TrainingContext } from '@/lib/ai/workout-enhancer';
import { getAIRequestLimit } from '@/lib/subscription-tiers';
import { checkRateLimit } from '@/lib/rate-limit';

interface EnhanceWorkoutRequest {
  // Either workoutId (enhance existing) or rawText (parse new)
  workoutId?: string;
  rawText?: string;
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

/**
 * Convert AI flat format to DynamoDB format
 */
function convertAIToDynamoDB(aiExercises: any[]): any[] {
  return aiExercises.map((exercise) => {
    // AI now returns flat format matching our table structure
    // AI format: { name, sets: 3, reps: "10" or "150M", weight: "135 lbs", duration: 200, notes, restSeconds }
    // DynamoDB format: { id, name, sets: number, reps, weight, restSeconds, notes, setDetails: [] }

    return {
      id: `ex_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
      name: exercise.name,
      sets: exercise.sets || 1,
      reps: exercise.reps || null,
      weight: exercise.weight || null,
      restSeconds: exercise.restSeconds || null,
      notes: exercise.notes || null,
      duration: exercise.duration || null,
      // Keep empty setDetails for backward compatibility
      setDetails: [],
    };
  });
}

export async function POST(req: NextRequest): Promise<NextResponse<EnhanceWorkoutResponse>> {
  try {
    // SECURITY FIX: Use new auth utility
    const auth = await getAuthenticatedUserId();
    if ('error' in auth) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }
    const { userId } = auth;

    // RATE LIMITING: Check rate limit (30 AI requests per hour)
    const rateLimit = await checkRateLimit(userId, 'api:ai');
    if (!rateLimit.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Too many AI requests',
          limit: rateLimit.limit,
          remaining: rateLimit.remaining,
          reset: rateLimit.reset,
        },
        {
          status: 429,
          headers: {
            'X-RateLimit-Limit': rateLimit.limit.toString(),
            'X-RateLimit-Remaining': rateLimit.remaining.toString(),
            'X-RateLimit-Reset': rateLimit.reset.toString(),
            'Retry-After': Math.ceil((rateLimit.reset - Date.now()) / 1000).toString(),
          },
        }
      );
    }

    const body: EnhanceWorkoutRequest = await req.json();
    const { workoutId, rawText, enhancementType = 'full' } = body;

    if (!workoutId && !rawText) {
      return NextResponse.json(
        { success: false, error: 'Either workoutId or rawText is required' },
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

    // Determine what we're enhancing: existing workout or raw text
    let textToEnhance: string;
    let existingWorkout: DynamoDBWorkout | null = null;

    if (workoutId) {
      // Enhancing existing workout
      const workout = await dynamoDBWorkouts.get(userId, workoutId);
      if (!workout) {
        return NextResponse.json(
          { success: false, error: 'Workout not found' },
          { status: 404 }
        );
      }
      existingWorkout = workout;
      // Convert workout to text for enhancement
      textToEnhance = JSON.stringify({
        title: workout.title,
        description: workout.description,
        exercises: workout.exercises,
      }, null, 2);
    } else if (rawText) {
      // Parsing raw text (from OCR or social media)
      textToEnhance = rawText;
    } else {
      return NextResponse.json(
        { success: false, error: 'Either workoutId or rawText is required' },
        { status: 400 }
      );
    }

    console.log('[AI Enhance] Calling Claude Sonnet 4.5...');
    console.log('[AI Enhance] Enhancement type:', enhancementType);
    console.log('[AI Enhance] Quota remaining:', aiLimit - aiUsed);

    // Build training context (TODO: Get PRs from user profile)
    const trainingContext: TrainingContext = {
      userId,
      experience: user.experience || 'intermediate',
      // personalRecords: await getUserPRs(userId), // TODO: Implement
    };

    // Call AI enhancer
    const result = await enhanceWorkout(textToEnhance, trainingContext);

    // Convert AI exercises format to DynamoDB format
    const convertedExercises = result.enhancedWorkout.exercises
      ? convertAIToDynamoDB(result.enhancedWorkout.exercises)
      : [];

    // Extract workout structure metadata
    const workoutType = result.enhancedWorkout.workoutType || 'standard';
    const structure = result.enhancedWorkout.structure || null;

    // If enhancing existing workout, merge with original
    let finalWorkout: DynamoDBWorkout;
    if (existingWorkout) {
      // Update existing workout
      const updates = {
        title: result.enhancedWorkout.title || existingWorkout.title,
        description: result.enhancedWorkout.description || existingWorkout.description,
        exercises: convertedExercises.length > 0 ? convertedExercises : existingWorkout.exercises,
        tags: result.enhancedWorkout.tags || existingWorkout.tags,
        difficulty: result.enhancedWorkout.difficulty || existingWorkout.difficulty,
        duration: result.enhancedWorkout.duration || existingWorkout.duration,
        workoutType,
        structure,
        aiEnhanced: true,
        aiNotes: 'AI enhanced workout with standardized exercise names and proper structure detection',
        updatedAt: new Date().toISOString(),
      };
      await dynamoDBWorkouts.update(userId, workoutId!, updates);
      finalWorkout = { ...existingWorkout, ...updates };
    } else {
      // Create new workout from parsed text
      const newWorkout: Partial<DynamoDBWorkout> = {
        userId,
        workoutId: `workout_${Date.now()}`,
        title: result.enhancedWorkout.title || 'Untitled Workout',
        description: result.enhancedWorkout.description || '',
        exercises: convertedExercises,
        content: textToEnhance, // Store original text
        tags: result.enhancedWorkout.tags || [],
        difficulty: result.enhancedWorkout.difficulty || 'intermediate',
        totalDuration: result.enhancedWorkout.duration || 60,
        source: 'ai-parse',
        type: 'manual',
        workoutType,
        structure,
        aiEnhanced: true,
        aiNotes: 'AI enhanced workout with standardized exercise names and proper structure detection',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      await dynamoDBWorkouts.upsert(userId, newWorkout as DynamoDBWorkout);
      finalWorkout = newWorkout as DynamoDBWorkout;
    }

    // Increment AI usage counter
    await dynamoDBUsers.incrementAIUsage(userId);

    // Calculate cost
    const cost = estimateEnhancementCost(textToEnhance.length);

    console.log('[AI Enhance] Success!');
    console.log('[AI Enhance] Workout Type:', workoutType);
    console.log('[AI Enhance] Structure:', structure);
    console.log('[AI Enhance] Tokens:', result.bedrockResponse.usage);
    console.log('[AI Enhance] Estimated cost:', cost);

    return NextResponse.json({
      success: true,
      enhancedWorkout: finalWorkout,
      cost: {
        inputTokens: result.bedrockResponse.usage.inputTokens,
        outputTokens: result.bedrockResponse.usage.outputTokens,
        estimatedCost: result.bedrockResponse.cost?.total || cost,
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

