/**
 * User Account Deletion API
 *
 * DELETE /api/user/delete - Permanently delete user account and all associated data
 */

import { NextResponse } from 'next/server';
import { getAuthenticatedUserId } from '@/lib/api-auth';
import { dynamoDBUsers, dynamoDBWorkouts } from '@/lib/dynamodb';

/**
 * DELETE /api/user/delete
 * Permanently delete user account and all associated data
 */
export async function DELETE() {
  try {
    // SECURITY: Authenticate user
    const auth = await getAuthenticatedUserId();
    if ('error' in auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const { userId } = auth;

    console.log('[Delete Account API] Starting account deletion for user:', userId);

    // Get user to check if they have a Stripe customer ID
    const user = await dynamoDBUsers.get(userId);

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // TODO: Cancel any active Stripe subscriptions
    if (user.stripeCustomerId) {
      console.log('[Delete Account API] User has Stripe customer ID:', user.stripeCustomerId);
      // In a production app, you would cancel their subscription here
      // For now, we'll just log it
    }

    // Delete all user's workouts
    try {
      const workouts = await dynamoDBWorkouts.getAllByUser(userId);
      console.log(`[Delete Account API] Deleting ${workouts.length} workouts`);

      for (const workout of workouts) {
        await dynamoDBWorkouts.delete(userId, workout.workoutId);
      }
    } catch (error) {
      console.error('[Delete Account API] Error deleting workouts:', error);
      // Continue with account deletion even if workout deletion fails
    }

    // Delete the user account
    await dynamoDBUsers.delete(userId);

    console.log('[Delete Account API] Account successfully deleted:', userId);

    return NextResponse.json({
      success: true,
      message: 'Account successfully deleted',
    });
  } catch (error) {
    console.error('[Delete Account API] DELETE error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete account',
      },
      { status: 500 }
    );
  }
}
