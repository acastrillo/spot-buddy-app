import { headers } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { dynamoDBUsers, dynamoDBWebhookEvents } from '@/lib/dynamodb'
import { PaidTier, assertPaidTier, constructEventFromPayload, getStripe } from '@/lib/stripe-server'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  const rawBody = await req.text()
  const signature = (await headers()).get('stripe-signature')

  let event: Stripe.Event
  try {
    event = constructEventFromPayload(rawBody, signature)
  } catch (err) {
    console.error('[Webhook] Signature verification failed:', err)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  // SECURITY: Idempotency check - prevent duplicate processing of webhook events
  // Stripe retries webhooks, so we need to track which events we've already processed
  try {
    const alreadyProcessed = await dynamoDBWebhookEvents.isProcessed(event.id)
    if (alreadyProcessed) {
      console.log(`[Webhook:${event.id}] ⚠️  Event already processed at ${alreadyProcessed.processedAt} - returning success to acknowledge`)
      return NextResponse.json({ received: true, duplicate: true })
    }
  } catch (error) {
    console.error(`[Webhook:${event.id}] CRITICAL: Failed to check idempotency - blocking request for safety:`, error)
    // Fail closed: if we can't check idempotency, block the request to prevent duplicate processing
    return NextResponse.json({ error: 'Idempotency check failed' }, { status: 503 })
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session, event.id)
        break
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        await handleSubscriptionUpsert(event.data.object as Stripe.Subscription, event.id)
        break
      case 'customer.subscription.deleted':
        await handleSubscriptionCanceled(event.data.object as Stripe.Subscription, event.id)
        break
      case 'invoice_payment.paid': // Newer alias in recent API versions
      case 'invoice.payment_succeeded':
        await handleInvoicePayment(event.data.object as Stripe.Invoice, 'succeeded', event.id)
        break
      case 'invoice_payment.failed': // Newer alias in recent API versions
      case 'invoice.payment_failed':
        await handleInvoicePayment(event.data.object as Stripe.Invoice, 'failed', event.id)
        break
      default:
        console.log(`[Webhook:${event.id}] Unhandled event type: ${event.type}`)
    }

    // Mark event as processed after successful handling
    try {
      await dynamoDBWebhookEvents.markProcessed(event.id, event.type)
      console.log(`[Webhook:${event.id}] ✓ Marked event as processed`)
    } catch (error) {
      console.error(`[Webhook:${event.id}] WARNING: Failed to mark event as processed (may be reprocessed on retry):`, error)
      // Don't fail the webhook if we can't mark it processed - better to potentially reprocess
      // than to reject and cause Stripe to keep retrying indefinitely
    }

    return NextResponse.json({ received: true })
  } catch (err) {
    console.error(`[Webhook:${event.id}] Error processing event ${event.type}:`, err)
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 })
  }
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session, eventId: string) {
  const userId = session.metadata?.userId
  const tier = session.metadata?.tier as PaidTier | undefined
  const customerId = typeof session.customer === 'string' ? session.customer : session.customer?.id || null
  const customerEmail = session.customer_email || session.customer_details?.email

  console.log(`[Webhook:${eventId}] checkout.session.completed:`, {
    sessionId: session.id,
    metadataUserId: userId,
    metadataTier: tier,
    customerId,
    customerEmail,
    clientReferenceId: session.client_reference_id,
  })

  if (!userId || !tier) {
    throw new Error(`[Webhook:${eventId}] Missing userId or tier in checkout.session.completed metadata`)
  }

  await ensureUserExists(userId)

  const subscriptionId =
    typeof session.subscription === 'string'
      ? session.subscription
      : session.subscription?.id || null

  console.log(`[Webhook:${eventId}] Updating user ${userId} to tier=${tier}, status=active, subscriptionId=${subscriptionId}`)

  await dynamoDBUsers.updateSubscription(userId, {
    tier,
    status: 'active',
    stripeCustomerId: customerId,
    stripeSubscriptionId: subscriptionId,
    startDate: new Date(),
    endDate: null,
  })

  console.log(`[Webhook:${eventId}] Successfully updated user ${userId} subscription`)
}

async function handleSubscriptionUpsert(subscription: Stripe.Subscription, eventId: string) {
  let userId = subscription.metadata?.userId
  const tierMeta = subscription.metadata?.tier as PaidTier | undefined
  const customerId = typeof subscription.customer === 'string' ? subscription.customer : subscription.customer?.id || null

  console.log(`[Webhook:${eventId}] subscription.upsert:`, {
    subscriptionId: subscription.id,
    metadataUserId: userId,
    metadataTier: tierMeta,
    customerId,
    status: subscription.status,
  })

  if (!userId) {
    console.log(`[Webhook:${eventId}] No userId in metadata, attempting fallback resolution...`)
    const fallback = await resolveUserByCustomer(subscription.customer, tierMeta)
    if (!fallback?.userId) {
      console.warn(`[Webhook:${eventId}] Subscription missing userId metadata and fallback failed; skipping`)
      return
    }
    userId = fallback.userId
    console.log(`[Webhook:${eventId}] Resolved userId via fallback: ${userId}`)
  }

  await ensureUserExists(userId)

  const tier = tierMeta
  const update: Parameters<typeof dynamoDBUsers.updateSubscription>[1] = {
    status: mapStripeStatus(subscription.status),
    stripeCustomerId: customerId,
    stripeSubscriptionId: subscription.id,
    startDate: toDate(subscription.current_period_start),
    endDate: subscription.cancel_at ? toDate(subscription.cancel_at) : null,
    trialEndsAt: subscription.trial_end ? toDate(subscription.trial_end) : null,
  }

  if (tier) update.tier = tier

  console.log(`[Webhook:${eventId}] Updating user ${userId}:`, update)
  await dynamoDBUsers.updateSubscription(userId, update)
  console.log(`[Webhook:${eventId}] Successfully updated user ${userId} subscription`)
}

async function handleSubscriptionCanceled(subscription: Stripe.Subscription, eventId: string) {
  const userId = subscription.metadata?.userId
  if (!userId) {
    console.warn(`[Webhook:${eventId}] Subscription cancellation missing userId; skipping`)
    return
  }

  await ensureUserExists(userId)

  await dynamoDBUsers.updateSubscription(userId, {
    tier: 'free',
    status: 'canceled',
    stripeCustomerId: typeof subscription.customer === 'string' ? subscription.customer : null,
    stripeSubscriptionId: subscription.id,
    endDate: new Date(),
  })
}

async function handleInvoicePayment(invoice: Stripe.Invoice, result: 'succeeded' | 'failed', eventId: string) {
  console.log(`[Webhook:${eventId}] invoice.payment.${result}:`, {
    invoiceId: invoice.id,
    customerId: typeof invoice.customer === 'string' ? invoice.customer : invoice.customer?.id,
    customerEmail: invoice.customer_email,
    subscriptionId: typeof invoice.subscription === 'string' ? invoice.subscription : invoice.subscription?.id,
  })

  const context = await resolveInvoiceContext(invoice)

  console.log(`[Webhook:${eventId}] Resolved invoice context:`, context)

  if (!context.userId) {
    console.warn(`[Webhook:${eventId}] Invoice ${invoice.id} missing userId; skipping status update`)
    return
  }

  await ensureUserExists(context.userId)

  const update = {
    status: result === 'succeeded' ? 'active' as const : 'past_due' as const,
    stripeCustomerId: context.customerId,
    stripeSubscriptionId: context.subscriptionId,
    ...(context.tier ? { tier: context.tier } : {}),
  }

  console.log(`[Webhook:${eventId}] Updating user ${context.userId}:`, update)
  await dynamoDBUsers.updateSubscription(context.userId, update)
  console.log(`[Webhook:${eventId}] Successfully updated user ${context.userId} subscription`)
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
    default:
      return 'inactive'
  }
}

function toDate(timestamp?: number | null): Date | null {
  if (!timestamp) return null
  return new Date(timestamp * 1000)
}

async function ensureUserExists(userId: string) {
  const user = await dynamoDBUsers.get(userId).catch(() => null)
  if (!user) {
    throw new Error(`User ${userId} not found in DynamoDB`)
  }
  return user
}

async function resolveInvoiceContext(invoice: Stripe.Invoice): Promise<{
  userId: string | null
  subscriptionId: string | null
  customerId: string | null
  tier: PaidTier | null
}> {
  const customerId = typeof invoice.customer === 'string' ? invoice.customer : invoice.customer?.id || null
  const subscriptionId =
    typeof invoice.subscription === 'string'
      ? invoice.subscription
      : invoice.subscription?.id || null

  // Prefer metadata from invoice payload if present
  const metaTier =
    (invoice.subscription_details as Stripe.Invoice.SubscriptionDetails | null | undefined)?.metadata?.tier ||
    (invoice as any)?.parent?.subscription_details?.metadata?.tier ||
    invoice.metadata?.tier
  const parsedTier = (() => {
    try {
      return metaTier ? assertPaidTier(metaTier) : null
    } catch {
      return null
    }
  })()

  const userIdFromInvoice =
    (invoice.subscription_details as Stripe.Invoice.SubscriptionDetails | null | undefined)?.metadata?.userId ||
    // Newer payloads sometimes nest under parent.subscription_details
    (invoice as any)?.parent?.subscription_details?.metadata?.userId ||
    invoice.metadata?.userId
  if (userIdFromInvoice) {
    return { userId: userIdFromInvoice as string, subscriptionId, customerId, tier: parsedTier }
  }

  // Fallback: try line item metadata
  const lineWithMeta =
    invoice.lines?.data?.find((line) => (line.metadata as Record<string, string> | undefined)?.userId) || null
  const userIdFromLine = (lineWithMeta?.metadata as Record<string, string> | undefined)?.userId
  if (userIdFromLine) {
    const lineTierRaw = (lineWithMeta?.metadata as Record<string, string> | undefined)?.tier
    const lineTier = (() => {
      try {
        return lineTierRaw ? assertPaidTier(lineTierRaw) : parsedTier
      } catch {
        return parsedTier
      }
    })()
    return { userId: userIdFromLine as string, subscriptionId, customerId, tier: lineTier }
  }

  if (!subscriptionId) {
    const resolved = await resolveUserByCustomer(customerId, parsedTier ?? undefined, invoice.customer_email || undefined)
    return {
      userId: resolved?.userId || null,
      subscriptionId,
      customerId,
      tier: resolved?.tier ?? parsedTier,
    }
  }

  // Fetch subscription to retrieve metadata reliably
  const subscription =
    typeof invoice.subscription === 'string'
      ? await getStripe().subscriptions.retrieve(invoice.subscription)
      : (invoice.subscription as Stripe.Subscription)

  const resolved = await resolveUserByCustomer(
    subscription.customer,
    parsedTier ?? undefined,
    invoice.customer_email || (typeof subscription.customer === 'string' ? undefined : (subscription.customer as Stripe.Customer).email) || undefined
  )
  const resolvedUserId = subscription.metadata?.userId || resolved?.userId || null

  return {
    userId: resolvedUserId,
    subscriptionId,
    customerId,
    tier: resolved?.tier ?? parsedTier,
  }
}

async function resolveUserByCustomer(
  customer: string | Stripe.Customer | Stripe.DeletedCustomer | null,
  tier?: PaidTier,
  emailHint?: string | null
): Promise<{ userId: string; tier: PaidTier | undefined } | null> {
  const stripeCustomerId = typeof customer === 'string' ? customer : customer?.id || null
  if (!stripeCustomerId) {
    console.log('[resolveUserByCustomer] No stripeCustomerId provided')
    return null
  }

  console.log(`[resolveUserByCustomer] Looking up user for stripeCustomerId=${stripeCustomerId}, emailHint=${emailHint}`)

  // 1. First try looking up by stripeCustomerId directly (fastest, most reliable)
  try {
    const userByCustomerId = await dynamoDBUsers.getByStripeCustomerId(stripeCustomerId)
    if (userByCustomerId) {
      console.log(`[resolveUserByCustomer] Found user by stripeCustomerId: userId=${userByCustomerId.id}, email=${userByCustomerId.email}`)
      return { userId: userByCustomerId.id, tier }
    }
  } catch (err) {
    console.warn('[resolveUserByCustomer] stripeCustomerId lookup failed (GSI may not exist):', err)
  }

  const directEmail =
    emailHint ||
    (typeof customer !== 'string' && 'email' in customer ? (customer as Stripe.Customer).email || undefined : undefined)

  const tryLookupByEmail = async (email: string | undefined) => {
    if (!email) return null
    console.log(`[resolveUserByCustomer] Trying email lookup: ${email}`)
    const user = await dynamoDBUsers.getByEmail(email)
    if (user) {
      console.log(`[resolveUserByCustomer] Found user by email: userId=${user.id}`)
      // Also update user's stripeCustomerId for future lookups (with race condition protection)
      if (!user.stripeCustomerId && stripeCustomerId) {
        console.log(`[resolveUserByCustomer] Linking stripeCustomerId=${stripeCustomerId} to user=${user.id}`)
        try {
          await dynamoDBUsers.upsert(
            { id: user.id, email: user.email, stripeCustomerId },
            {
              // Only link if stripeCustomerId doesn't exist yet (prevent concurrent webhooks from overwriting)
              ConditionExpression: 'attribute_not_exists(stripeCustomerId)',
            }
          )
        } catch (error: any) {
          if (error.name === 'ConditionalCheckFailedException') {
            console.log(`[resolveUserByCustomer] ⚠️  stripeCustomerId already set for user=${user.id} (concurrent webhook)`)
          } else {
            throw error
          }
        }
      }
    }
    return user ? { userId: user.id, tier } : null
  }

  // 2. Try email hint
  const byHint = await tryLookupByEmail(directEmail)
  if (byHint) return byHint

  // 3. Fetch customer from Stripe and try their email
  try {
    const cust = await getStripe().customers.retrieve(stripeCustomerId)
    const custEmail = (cust as Stripe.Customer).email || undefined
    console.log(`[resolveUserByCustomer] Stripe customer email: ${custEmail}`)
    const byCust = await tryLookupByEmail(custEmail)
    if (byCust) return byCust
  } catch (err) {
    console.warn('[resolveUserByCustomer] Failed to retrieve Stripe customer:', err)
  }

  console.log(`[resolveUserByCustomer] Could not resolve user for stripeCustomerId=${stripeCustomerId}`)
  return null
}
