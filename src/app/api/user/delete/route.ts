/**
 * User Account Deletion API
 *
 * DELETE /api/user/delete - Permanently delete user account and all associated data
 */

import { NextResponse } from 'next/server';
import { getAuthenticatedUserId } from '@/lib/api-auth';
import { dynamoDBUsers, dynamoDBWorkouts } from '@/lib/dynamodb';
import { getStripe } from '@/lib/stripe-server';
import { maskToken, maskUserId } from '@/lib/safe-logger';

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

    const maskedUserId = maskUserId(userId);
    console.log('[Delete Account API] Starting account deletion for user:', maskedUserId);

    // Get user to check if they have a Stripe customer ID
    const user = await dynamoDBUsers.get(userId);

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Cancel any active Stripe subscriptions
    if (user.stripeCustomerId) {
      console.log('[Delete Account API] User has Stripe customer ID:', maskToken(user.stripeCustomerId));

      try {
        const stripe = getStripe();

        // Get all subscriptions for this customer
        const subscriptions = await stripe.subscriptions.list({
          customer: user.stripeCustomerId,
          status: 'active',
        });

        console.log(`[Delete Account API] Found ${subscriptions.data.length} active subscriptions`);

        // Cancel each active subscription
        for (const subscription of subscriptions.data) {
          await stripe.subscriptions.cancel(subscription.id);
          console.log(`[Delete Account API] Canceled subscription: ${maskToken(subscription.id)}`);
        }
      } catch (stripeError) {
        console.error('[Delete Account API] Error canceling Stripe subscriptions:', stripeError);
        // Continue with account deletion even if subscription cancellation fails
        // This ensures users can still delete their account
      }
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

    console.log('[Delete Account API] Account successfully deleted:', maskedUserId);

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
