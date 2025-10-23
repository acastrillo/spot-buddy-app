/**
 * Training Profile API
 * Handles CRUD operations for user training profile
 *
 * GET /api/user/profile - Get current user's training profile
 * POST /api/user/profile - Create/update training profile
 * PATCH /api/user/profile - Partially update training profile
 */
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { dynamoDBUsers, DynamoDBUser } from '@/lib/dynamodb';

/**
 * GET /api/user/profile
 * Get the current user's training profile
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const userId = (session.user as any).id;
    const user = await dynamoDBUsers.get(userId);

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      profile: user.trainingProfile || null,
    });
  } catch (error) {
    console.error('[Profile API] Error getting training profile:', error);
    return NextResponse.json(
      { error: 'Failed to fetch training profile' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/user/profile
 * Create or replace training profile
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const userId = (session.user as any).id;
    const profile: DynamoDBUser['trainingProfile'] = await req.json();

    // Validate profile structure
    if (profile && typeof profile !== 'object') {
      return NextResponse.json(
        { error: 'Invalid profile format' },
        { status: 400 }
      );
    }

    // Update profile in DynamoDB
    await dynamoDBUsers.updateTrainingProfile(userId, profile);

    return NextResponse.json({
      success: true,
      message: 'Training profile updated successfully',
      profile,
    });
  } catch (error) {
    console.error('[Profile API] Error updating training profile:', error);
    return NextResponse.json(
      { error: 'Failed to update training profile' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/user/profile
 * Partially update training profile (merge with existing)
 */
export async function PATCH(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const userId = (session.user as any).id;
    const updates: Partial<DynamoDBUser['trainingProfile']> = await req.json();

    // Get current profile
    const user = await dynamoDBUsers.get(userId);
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Merge with existing profile
    const currentProfile = user.trainingProfile || {};
    const updatedProfile = {
      ...currentProfile,
      ...updates,
    };

    // Update in DynamoDB
    await dynamoDBUsers.updateTrainingProfile(userId, updatedProfile);

    return NextResponse.json({
      success: true,
      message: 'Training profile updated successfully',
      profile: updatedProfile,
    });
  } catch (error) {
    console.error('[Profile API] Error patching training profile:', error);
    return NextResponse.json(
      { error: 'Failed to update training profile' },
      { status: 500 }
    );
  }
}
