import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { stripe } from '@/lib/stripe'
import { dynamoDBUsers } from '@/lib/dynamodb'
import Stripe from 'stripe'

export async function POST(req: NextRequest) {
  const body = await req.text()
  const signature = (await headers()).get('stripe-signature')

  if (!signature) {
    return NextResponse.json({ error: 'No signature' }, { status: 400 })
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET
  if (!webhookSecret) {
    console.error('STRIPE_WEBHOOK_SECRET is not set')
    return NextResponse.json({ error: 'Webhook secret not configured' }, { status: 500 })
  }

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
  } catch (err) {
    console.error('Webhook signature verification failed:', err)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  // Handle the event
  const eventStartTime = Date.now()
  console.log(`[Webhook] Event received: ${event.type} (ID: ${event.id})`)

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        await handleCheckoutCompleted(session, event.id)
        break
      }

      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription
        await handleSubscriptionUpdate(subscription, event.id)
        break
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription
        await handleSubscriptionCanceled(subscription, event.id)
        break
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice
        await handlePaymentSucceeded(invoice, event.id)
        break
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice
        await handlePaymentFailed(invoice, event.id)
        break
      }

      default:
        console.log(`[Webhook] Unhandled event type: ${event.type} (ID: ${event.id})`)
    }

    const duration = Date.now() - eventStartTime
    console.log(`[Webhook] Event ${event.type} processed successfully in ${duration}ms (ID: ${event.id})`)
    return NextResponse.json({ received: true })
  } catch (error) {
    const duration = Date.now() - eventStartTime
    console.error(`[Webhook] ERROR processing event ${event.type} after ${duration}ms (ID: ${event.id}):`, error)
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 })
  }
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session, eventId: string) {
  console.log(`[Webhook:${eventId}] Processing checkout.session.completed`)
  console.log(`[Webhook:${eventId}] Session metadata:`, JSON.stringify(session.metadata, null, 2))
  console.log(`[Webhook:${eventId}] Session ID: ${session.id}, Customer: ${session.customer}, Subscription: ${session.subscription}`)

  const userId = session.metadata?.userId
  const tier = session.metadata?.tier

  if (!userId || !tier) {
    console.error(`[Webhook:${eventId}] CRITICAL ERROR: Missing userId or tier in metadata`)
    console.error(`[Webhook:${eventId}] userId=${userId}, tier=${tier}`)
    throw new Error(`Missing metadata - userId: ${userId}, tier: ${tier}`)
  }

  // Verify user exists in DynamoDB before updating
  const existingUser = await dynamoDBUsers.get(userId).catch(() => null)
  if (!existingUser) {
    console.error(`[Webhook:${eventId}] ERROR: User ${userId} not found in DynamoDB. Cannot update subscription.`)
    throw new Error(`User ${userId} not found in DynamoDB`)
  }

  console.log(`[Webhook:${eventId}] User verified: ${existingUser.email} (current tier: ${existingUser.subscriptionTier})`)

  const subscriptionId = session.subscription as string
  const updateData = {
    tier: tier as any,
    status: 'active' as const,
    stripeCustomerId: typeof session.customer === 'string' ? session.customer : null,
    stripeSubscriptionId: subscriptionId || null,
    startDate: new Date(),
    endDate: null,
  }

  console.log(`[Webhook:${eventId}] Updating user ${userId} (${existingUser.email}): ${existingUser.subscriptionTier} → ${tier}`)

  try {
    await dynamoDBUsers.updateSubscription(userId, updateData)
    console.log(`[Webhook:${eventId}] ✓ SUCCESS: User ${userId} upgraded to ${tier}`)
  } catch (dbError) {
    console.error(`[Webhook:${eventId}] ✗ DynamoDB update failed for user ${userId}:`, dbError)
    throw dbError
  }
}

async function handleSubscriptionUpdate(subscription: Stripe.Subscription, eventId: string) {
  console.log(`[Webhook:${eventId}] Processing subscription update (status: ${subscription.status})`)
  console.log(`[Webhook:${eventId}] Subscription metadata:`, JSON.stringify(subscription.metadata, null, 2))
  console.log(`[Webhook:${eventId}] Subscription ID: ${subscription.id}`)

  const userId = subscription.metadata?.userId

  if (!userId) {
    console.warn(`[Webhook:${eventId}] Missing userId in subscription metadata - skipping`)
    console.warn(`[Webhook:${eventId}] This is expected if checkout.session.completed already handled initial setup`)
    return
  }

  // Verify user exists
  const existingUser = await dynamoDBUsers.get(userId).catch(() => null)
  if (!existingUser) {
    console.error(`[Webhook:${eventId}] ERROR: User ${userId} not found in DynamoDB. Skipping update.`)
    return
  }

  console.log(`[Webhook:${eventId}] User verified: ${existingUser.email} (current: ${existingUser.subscriptionTier}/${existingUser.subscriptionStatus})`)

  const status = subscription.status
  const tier = subscription.metadata?.tier

  const updateData: Parameters<typeof dynamoDBUsers.updateSubscription>[1] = {
    status: mapStripeStatus(status),
    stripeCustomerId: typeof subscription.customer === 'string' ? subscription.customer : null,
    stripeSubscriptionId: subscription.id,
    startDate: subscription.current_period_start
      ? new Date(subscription.current_period_start * 1000)
      : undefined,
    endDate:
      subscription.cancel_at !== null
        ? subscription.cancel_at
          ? new Date(subscription.cancel_at * 1000)
          : null
        : undefined,
    trialEndsAt:
      subscription.trial_end !== null && subscription.trial_end !== undefined
        ? subscription.trial_end
          ? new Date(subscription.trial_end * 1000)
          : null
        : undefined,
  }

  if (tier) {
    updateData.tier = tier as any
  }

  console.log(`[Webhook:${eventId}] Update details:`, JSON.stringify(updateData, null, 2))

  try {
    await dynamoDBUsers.updateSubscription(userId, updateData)
    console.log(`[Webhook:${eventId}] ✓ SUCCESS: User ${userId} (${existingUser.email}) updated to ${updateData.status}${tier ? ` (${tier})` : ''}`)
  } catch (dbError) {
    console.error(`[Webhook:${eventId}] ✗ DynamoDB update failed:`, dbError)
    throw dbError
  }
}

async function handleSubscriptionCanceled(subscription: Stripe.Subscription, eventId: string) {
  console.log(`[Webhook:${eventId}] Processing subscription cancellation`)
  const userId = subscription.metadata?.userId

  if (!userId) {
    console.error(`[Webhook:${eventId}] ERROR: Missing userId in subscription metadata`)
    return
  }

  const existingUser = await dynamoDBUsers.get(userId).catch(() => null)
  if (!existingUser) {
    console.error(`[Webhook:${eventId}] ERROR: User ${userId} not found in DynamoDB`)
    return
  }

  console.log(`[Webhook:${eventId}] Canceling subscription for ${existingUser.email} (was: ${existingUser.subscriptionTier})`)

  await dynamoDBUsers.updateSubscription(userId, {
    tier: 'free',
    status: 'canceled',
    stripeSubscriptionId: subscription.id,
    endDate: new Date(),
  })

  console.log(`[Webhook:${eventId}] ✓ Subscription canceled for user ${userId}`)
}

async function handlePaymentSucceeded(invoice: Stripe.Invoice, eventId: string) {
  console.log(`[Webhook:${eventId}] Processing payment success (Invoice: ${invoice.id})`)
  const userId = invoice.subscription_details?.metadata?.userId

  if (!userId) {
    console.warn(`[Webhook:${eventId}] No userId in invoice metadata - skipping`)
    return
  }

  const existingUser = await dynamoDBUsers.get(userId).catch(() => null)
  if (!existingUser) {
    console.error(`[Webhook:${eventId}] ERROR: User ${userId} not found in DynamoDB`)
    return
  }

  console.log(`[Webhook:${eventId}] Marking ${existingUser.email} subscription as active`)

  // Payment succeeded, ensure subscription is active
  await dynamoDBUsers.updateSubscription(userId, {
    status: 'active',
  })

  console.log(`[Webhook:${eventId}] ✓ Payment succeeded for user ${userId}`)
}

async function handlePaymentFailed(invoice: Stripe.Invoice, eventId: string) {
  console.log(`[Webhook:${eventId}] Processing payment failure (Invoice: ${invoice.id})`)
  const userId = invoice.subscription_details?.metadata?.userId

  if (!userId) {
    console.warn(`[Webhook:${eventId}] No userId in invoice metadata - skipping`)
    return
  }

  const existingUser = await dynamoDBUsers.get(userId).catch(() => null)
  if (!existingUser) {
    console.error(`[Webhook:${eventId}] ERROR: User ${userId} not found in DynamoDB`)
    return
  }

  console.log(`[Webhook:${eventId}] Marking ${existingUser.email} subscription as past_due`)

  // Payment failed, mark as past_due
  await dynamoDBUsers.updateSubscription(userId, {
    status: 'past_due',
  })

  console.log(`[Webhook:${eventId}] ✓ Payment failed for user ${userId} - marked past_due`)
}

function mapStripeStatus(stripeStatus: Stripe.Subscription.Status): 'active' | 'inactive' | 'trialing' | 'canceled' | 'past_due' {
  switch (stripeStatus) {
    case 'active':
      return 'active'
    case 'trialing':
      return 'trialing'
    case 'canceled':
    case 'unpaid':
      return 'canceled'
    case 'past_due':
      return 'past_due'
    case 'incomplete':
    case 'incomplete_expired':
    case 'paused':
    default:
      return 'inactive'
  }
}
