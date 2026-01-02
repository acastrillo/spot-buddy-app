/**
 * AI Workout Generation API
 *
 * POST /api/ai/generate-workout
 *
 * Generates a complete workout from natural language input:
 * - "Upper body, dumbbells only, 45 minutes"
 * - "Leg day with squats and deadlifts"
 * - "Full body strength workout"
 */
import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedSession } from '@/lib/api-auth';
import { dynamoDBUsers, dynamoDBWorkouts, DynamoDBWorkout } from '@/lib/dynamodb';
import { generateWorkout, validateGeneratedWorkout } from '@/lib/ai/workout-generator';
import { getAIRequestLimit, normalizeSubscriptionTier } from '@/lib/subscription-tiers';
import { checkRateLimit } from '@/lib/rate-limit';

interface GenerateWorkoutRequest {
  prompt: string;
}

interface GenerateWorkoutResponse {
  success: boolean;
  workout?: DynamoDBWorkout;
  cost?: {
    inputTokens: number;
    outputTokens: number;
    estimatedCost: number;
  };
  quotaRemaining?: number;
  rationale?: string;
  alternatives?: string[];
  error?: string;
}

export async function POST(req: NextRequest): Promise<NextResponse<GenerateWorkoutResponse>> {
  try {
    // Authentication
    const auth = await getAuthenticatedSession();
    if ('error' in auth) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }
    const { userId, session } = auth;

    // Rate limiting (30 AI requests per hour across all AI features)
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

    // Parse request
    const body: GenerateWorkoutRequest = await req.json();
    const { prompt } = body;

    if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: 'Prompt is required and must be a non-empty string' },
        { status: 400 }
      );
    }

    // Get user and check AI quota (create if doesn't exist)
    let user = await dynamoDBUsers.get(userId);
    if (!user) {
      // User not synced to DynamoDB yet - create with defaults
      console.log('[AI Generate] User not found in DynamoDB, creating with defaults');
      try {
        const userEmail = session.user?.email || `user-${userId}@temp.com`;
        const firstName = (session.user as any)?.firstName || null;
        const lastName = (session.user as any)?.lastName || null;

        // Create user with free tier (production default)
        user = await dynamoDBUsers.upsert({
          id: userId,
          email: userEmail,
          firstName,
          lastName,
          subscriptionTier: 'free',
          aiRequestsLimit: 0,
        });
        console.log('[AI Generate] User created successfully');
      } catch (createError) {
        console.error('[AI Generate] Failed to create user:', createError);
        return NextResponse.json(
          { success: false, error: 'User not found and could not be created. Please try logging out and back in.' },
          { status: 500 }
        );
      }
    }

    const tier = normalizeSubscriptionTier(user.subscriptionTier);
    const aiLimit = getAIRequestLimit(tier);
    const aiUsed = user.aiRequestsUsed || 0;

    // ADMIN BYPASS: Admins have unlimited AI quotas
    const isAdmin = user.isAdmin === true;

    // Check if user has AI quota remaining (skip for admins)
    if (!isAdmin && aiUsed >= aiLimit) {
      const upgradeMessage = aiLimit === 0
        ? 'AI workout generation is not available on the free tier. Upgrade to Core ($8.99/mo) for 10 AI requests per month.'
        : `You've reached your AI request limit (${aiUsed}/${aiLimit} used this month). Upgrade to Pro for more AI requests.`;

      return NextResponse.json(
        {
          success: false,
          error: upgradeMessage,
          quotaRemaining: 0,
          tier,
          aiUsed,
          aiLimit,
        },
        { status: 403 }
      );
    }

    console.log('[AI Generate] Starting workout generation...');
    console.log('[AI Generate] Prompt:', prompt);
    console.log('[AI Generate] Quota remaining:', aiLimit - aiUsed);

    // Get user's training profile (if available)
    const trainingProfile = user.trainingProfile || undefined;

    // Generate workout using AI
    const result = await generateWorkout({
      prompt,
      trainingProfile,
      userId,
    });

    // Validate generated workout
    const validation = validateGeneratedWorkout(result.workout);
    if (!validation.valid) {
      console.error('[AI Generate] Generated workout failed validation:', validation.errors);
      return NextResponse.json(
        {
          success: false,
          error: 'Generated workout is invalid. Please try again with a different prompt.',
        },
        { status: 500 }
      );
    }

    // Convert AI workout format to DynamoDB format
    const exercises = result.workout.exercises?.map((exercise: any) => ({
      id: `ex_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
      name: exercise.name,
      sets: exercise.sets || 1,
      reps: exercise.reps || null,
      weight: exercise.weight || null,
      restSeconds: exercise.restSeconds || null,
      notes: exercise.notes || null,
      duration: exercise.duration || null,
      setDetails: [],
    })) || [];

    // Create workout in DynamoDB
    const newWorkout: Partial<DynamoDBWorkout> = {
      userId,
      workoutId: `workout_${Date.now()}`,
      title: result.workout.title || 'AI Generated Workout',
      description: result.workout.description || '',
      exercises,
      content: prompt, // Store original prompt
      tags: result.workout.tags || [],
      difficulty: result.workout.difficulty || 'intermediate',
      totalDuration: result.workout.duration || 60,
      source: 'ai-generate',
      type: 'manual',
      workoutType: 'standard',
      aiEnhanced: true,
      aiNotes: [
        `AI generated workout from prompt: "${prompt}"`,
        `Rationale: ${result.rationale}`,
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await dynamoDBWorkouts.upsert(userId, newWorkout as DynamoDBWorkout);
    const savedWorkout = newWorkout as DynamoDBWorkout;

    // Increment AI usage counter (skip for admins to keep their count at 0)
    if (!isAdmin) {
      await dynamoDBUsers.incrementAIUsage(userId);
    }

    console.log('[AI Generate] Success!');
    console.log('[AI Generate] Workout:', savedWorkout.title);
    console.log('[AI Generate] Exercises:', exercises.length);
    console.log('[AI Generate] Tokens:', result.bedrockResponse.usage);
    console.log('[AI Generate] Cost:', result.bedrockResponse.cost?.total.toFixed(4));

    return NextResponse.json({
      success: true,
      workout: savedWorkout,
      cost: {
        inputTokens: result.bedrockResponse.usage.inputTokens,
        outputTokens: result.bedrockResponse.usage.outputTokens,
        estimatedCost: result.bedrockResponse.cost?.total || 0,
      },
      quotaRemaining: isAdmin ? 999999 : aiLimit - aiUsed - 1,
      rationale: result.rationale,
      alternatives: result.alternatives,
    });
  } catch (error) {
    console.error('[AI Generate] Error:', error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to generate workout',
      },
      { status: 500 }
    );
  }
}
