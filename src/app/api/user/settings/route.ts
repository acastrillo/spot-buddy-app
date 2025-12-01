/**
 * User Settings API
 *
 * PATCH /api/user/settings - Update user profile settings (name)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUserId } from '@/lib/api-auth';
import { dynamoDBUsers } from '@/lib/dynamodb';

/**
 * PATCH /api/user/settings
 * Update user profile settings
 */
export async function PATCH(req: NextRequest) {
  try {
    // SECURITY: Authenticate user
    const auth = await getAuthenticatedUserId();
    if ('error' in auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const { userId } = auth;

    // Parse request body
    const { firstName, lastName } = await req.json();

    // Validate input
    if (firstName === undefined && lastName === undefined) {
      return NextResponse.json(
        { error: 'At least one field (firstName or lastName) must be provided' },
        { status: 400 }
      );
    }

    // Validate field types and lengths
    if (firstName !== undefined) {
      if (typeof firstName !== 'string' && firstName !== null) {
        return NextResponse.json(
          { error: 'firstName must be a string or null' },
          { status: 400 }
        );
      }
      if (typeof firstName === 'string' && firstName.length > 100) {
        return NextResponse.json(
          { error: 'firstName must be 100 characters or less' },
          { status: 400 }
        );
      }
    }

    if (lastName !== undefined) {
      if (typeof lastName !== 'string' && lastName !== null) {
        return NextResponse.json(
          { error: 'lastName must be a string or null' },
          { status: 400 }
        );
      }
      if (typeof lastName === 'string' && lastName.length > 100) {
        return NextResponse.json(
          { error: 'lastName must be 100 characters or less' },
          { status: 400 }
        );
      }
    }

    // Build updates object with only provided fields
    const updates: { firstName?: string | null; lastName?: string | null } = {};
    if (firstName !== undefined) updates.firstName = firstName || null;
    if (lastName !== undefined) updates.lastName = lastName || null;

    // Update in DynamoDB
    await dynamoDBUsers.update(userId, updates);

    // Get updated user data
    const updatedUser = await dynamoDBUsers.get(userId);

    console.log('[Settings API] User profile updated:', userId);

    return NextResponse.json({
      success: true,
      user: {
        id: updatedUser?.id,
        email: updatedUser?.email,
        firstName: updatedUser?.firstName,
        lastName: updatedUser?.lastName,
      },
      message: 'Profile updated successfully',
    });
  } catch (error) {
    console.error('[Settings API] PATCH error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update settings',
      },
      { status: 500 }
    );
  }
}
