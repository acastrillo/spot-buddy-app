import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { generateWorkout } from '@/lib/ai/workout-generator';
import { dynamoDBWorkouts } from '@/lib/dynamodb';
import { checkRateLimit } from '@/lib/rate-limit';

export async function POST(req: NextRequest) {
  try {
    // Authentication
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const userId = (session.user as any).id;
    if (!userId) {
      return NextResponse.json(
        { error: 'User ID not found' },
        { status: 401 }
      );
    }

    // Rate limiting
    const rateLimitStatus = await checkRateLimit(userId, 'api:ai-generate');
    if (!rateLimitStatus.success) {
      const retryAfterSeconds = Math.max(
        0,
        Math.ceil((rateLimitStatus.reset - Date.now()) / 1000)
      );

      return NextResponse.json(
        {
          error: 'Rate limit exceeded',
          limit: rateLimitStatus.limit,
          remaining: rateLimitStatus.remaining,
          reset: rateLimitStatus.reset,
        },
        {
          status: 429,
          headers: {
            'X-RateLimit-Limit': rateLimitStatus.limit.toString(),
            'X-RateLimit-Remaining': rateLimitStatus.remaining.toString(),
            'X-RateLimit-Reset': rateLimitStatus.reset.toString(),
            'Retry-After': retryAfterSeconds.toString(),
          },
        }
      );
    }

    // Parse request
    const { prompt } = await req.json();
    if (!prompt || typeof prompt !== 'string') {
      return NextResponse.json(
        { error: 'Prompt is required and must be a string' },
        { status: 400 }
      );
    }

    // Generate workout
    const result = await generateWorkout({ prompt, userId });

    // Save to DynamoDB (auto-generated ID)
    const savedWorkout = await dynamoDBWorkouts.upsert(userId, result.workout);

    return NextResponse.json({
      success: true,
      workout: savedWorkout,
      cost: result.cost,
      tokensUsed: result.tokensUsed,
    });
  } catch (error: any) {
    console.error('Error generating workout:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to generate workout' },
      { status: 500 }
    );
  }
}
