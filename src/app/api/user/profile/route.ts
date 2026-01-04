/**
 * Training Profile API
 *
 * GET  /api/user/profile - Get user's training profile
 * PUT  /api/user/profile - Update training profile
 * POST /api/user/profile/pr - Add/update personal record
 * DELETE /api/user/profile/pr - Delete personal record
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUserId } from '@/lib/api-auth';
import { dynamoDBUsers } from '@/lib/dynamodb';
import { checkRateLimit } from '@/lib/rate-limit';
import {
  type TrainingProfile,
  type PersonalRecord,
  defaultTrainingProfile,
  validateTrainingProfile,
  mergeTrainingProfile,
} from '@/lib/training-profile';

/**
 * GET /api/user/profile
 * Retrieve user's training profile
 */
export async function GET() {
  try {
    // SECURITY: Authenticate user
    const auth = await getAuthenticatedUserId();
    if ('error' in auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const { userId } = auth;

    const rateLimit = await checkRateLimit(userId, 'api:read');
    if (!rateLimit.success) {
      return NextResponse.json(
        {
          error: 'Too many requests',
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

    // Get user from DynamoDB
    const user = await dynamoDBUsers.get(userId);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Return training profile (or default if none exists)
    const profile = user.trainingProfile || {
      ...defaultTrainingProfile,
      createdAt: new Date().toISOString(),
    };

    return NextResponse.json({
      success: true,
      profile,
    });
  } catch (error) {
    console.error('[Profile API] GET error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get profile',
      },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/user/profile
 * Update user's training profile
 */
export async function PUT(req: NextRequest) {
  try {
    // SECURITY: Authenticate user
    const auth = await getAuthenticatedUserId();
    if ('error' in auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const { userId } = auth;

    const rateLimit = await checkRateLimit(userId, 'api:write');
    if (!rateLimit.success) {
      return NextResponse.json(
        {
          error: 'Too many requests',
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

    // Parse request body
    const updates: Partial<TrainingProfile> = await req.json();

    // Validate profile updates
    const validation = validateTrainingProfile(updates);
    if (!validation.valid) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid profile data',
          errors: validation.errors,
        },
        { status: 400 }
      );
    }

    // Get existing user
    const user = await dynamoDBUsers.get(userId);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Merge with existing profile
    const existingProfile = user.trainingProfile || {
      ...defaultTrainingProfile,
      createdAt: new Date().toISOString(),
    };
    const updatedProfile = mergeTrainingProfile(existingProfile, updates);

    // Update in DynamoDB
    await dynamoDBUsers.update(userId, {
      trainingProfile: updatedProfile,
    });

    console.log('[Profile API] Profile updated:', userId);

    return NextResponse.json({
      success: true,
      profile: updatedProfile,
    });
  } catch (error) {
    console.error('[Profile API] PUT error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update profile',
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/user/profile/pr
 * Add or update a personal record
 */
export async function POST(req: NextRequest) {
  try {
    // SECURITY: Authenticate user
    const auth = await getAuthenticatedUserId();
    if ('error' in auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const { userId } = auth;

    const rateLimit = await checkRateLimit(userId, 'api:write');
    if (!rateLimit.success) {
      return NextResponse.json(
        {
          error: 'Too many requests',
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

    // Parse request body
    const { exercise, pr }: { exercise: string; pr: PersonalRecord } = await req.json();

    if (!exercise || !pr) {
      return NextResponse.json(
        { success: false, error: 'Exercise and PR data required' },
        { status: 400 }
      );
    }

    // Validate PR data
    if (!pr.weight || pr.weight <= 0) {
      return NextResponse.json(
        { success: false, error: 'Weight must be greater than 0' },
        { status: 400 }
      );
    }
    if (!pr.reps || pr.reps <= 0) {
      return NextResponse.json(
        { success: false, error: 'Reps must be greater than 0' },
        { status: 400 }
      );
    }
    if (!pr.unit || !['kg', 'lbs'].includes(pr.unit)) {
      return NextResponse.json(
        { success: false, error: 'Unit must be kg or lbs' },
        { status: 400 }
      );
    }

    // Get existing user
    const user = await dynamoDBUsers.get(userId);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Get existing profile or create default
    const profile = user.trainingProfile || {
      ...defaultTrainingProfile,
      createdAt: new Date().toISOString(),
    };

    // Add/update PR
    profile.personalRecords[exercise] = {
      ...pr,
      date: pr.date || new Date().toISOString().split('T')[0], // YYYY-MM-DD
    };
    profile.updatedAt = new Date().toISOString();

    // Update in DynamoDB
    await dynamoDBUsers.update(userId, {
      trainingProfile: profile,
    });

    console.log('[Profile API] PR added/updated:', userId, exercise, pr);

    return NextResponse.json({
      success: true,
      profile,
      message: `PR for ${exercise} updated successfully`,
    });
  } catch (error) {
    console.error('[Profile API] POST PR error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to add PR',
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/user/profile/pr?exercise={exercise}
 * Delete a personal record
 */
export async function DELETE(req: NextRequest) {
  try {
    // SECURITY: Authenticate user
    const auth = await getAuthenticatedUserId();
    if ('error' in auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const { userId } = auth;

    const rateLimit = await checkRateLimit(userId, 'api:write');
    if (!rateLimit.success) {
      return NextResponse.json(
        {
          error: 'Too many requests',
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

    // Get exercise from query params
    const { searchParams } = new URL(req.url);
    const exercise = searchParams.get('exercise');

    if (!exercise) {
      return NextResponse.json(
        { success: false, error: 'Exercise name required' },
        { status: 400 }
      );
    }

    // Get existing user
    const user = await dynamoDBUsers.get(userId);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Get existing profile
    const profile = user.trainingProfile;
    if (!profile || !profile.personalRecords[exercise]) {
      return NextResponse.json(
        { success: false, error: 'PR not found' },
        { status: 404 }
      );
    }

    // Delete PR
    delete profile.personalRecords[exercise];
    profile.updatedAt = new Date().toISOString();

    // Update in DynamoDB
    await dynamoDBUsers.update(userId, {
      trainingProfile: profile,
    });

    console.log('[Profile API] PR deleted:', userId, exercise);

    return NextResponse.json({
      success: true,
      profile,
      message: `PR for ${exercise} deleted successfully`,
    });
  } catch (error) {
    console.error('[Profile API] DELETE PR error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete PR',
      },
      { status: 500 }
    );
  }
}
