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
  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        await handleCheckoutCompleted(session)
        break
      }

      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription
        await handleSubscriptionUpdate(subscription)
        break
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription
        await handleSubscriptionCanceled(subscription)
        break
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice
        await handlePaymentSucceeded(invoice)
        break
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice
        await handlePaymentFailed(invoice)
        break
      }

      default:
        console.log(`Unhandled event type: ${event.type}`)
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('Error processing webhook:', error)
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 })
  }
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const userId = session.metadata?.userId
  const tier = session.metadata?.tier

  if (!userId || !tier) {
    console.error('Missing userId or tier in checkout session metadata')
    return
  }

  const subscriptionId = session.subscription as string

  await dynamoDBUsers.updateSubscription(userId, {
    tier: tier as any,
    status: 'active',
    stripeCustomerId: typeof session.customer === 'string' ? session.customer : null,
    stripeSubscriptionId: subscriptionId || null,
    startDate: new Date(),
    endDate: null,
  })

  console.log(`Subscription activated for user ${userId}: ${tier}`)
}

async function handleSubscriptionUpdate(subscription: Stripe.Subscription) {
  const userId = subscription.metadata?.userId

  if (!userId) {
    console.error('Missing userId in subscription metadata')
    return
  }

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

  await dynamoDBUsers.updateSubscription(userId, updateData)

  console.log(`Subscription updated for user ${userId}: ${status}`)
}

async function handleSubscriptionCanceled(subscription: Stripe.Subscription) {
  const userId = subscription.metadata?.userId

  if (!userId) {
    console.error('Missing userId in subscription metadata')
    return
  }

  await dynamoDBUsers.updateSubscription(userId, {
    tier: 'free',
    status: 'canceled',
    stripeSubscriptionId: subscription.id,
    endDate: new Date(),
  })

  console.log(`Subscription canceled for user ${userId}`)
}

async function handlePaymentSucceeded(invoice: Stripe.Invoice) {
  const userId = invoice.subscription_details?.metadata?.userId

  if (!userId) {
    return
  }

  // Payment succeeded, ensure subscription is active
  await dynamoDBUsers.updateSubscription(userId, {
    status: 'active',
  })

  console.log(`Payment succeeded for user ${userId}`)
}

async function handlePaymentFailed(invoice: Stripe.Invoice) {
  const userId = invoice.subscription_details?.metadata?.userId

  if (!userId) {
    return
  }

  // Payment failed, mark as past_due
  await dynamoDBUsers.updateSubscription(userId, {
    status: 'past_due',
  })

  console.log(`Payment failed for user ${userId}`)
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
