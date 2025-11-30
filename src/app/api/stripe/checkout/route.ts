import { randomUUID } from 'crypto'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getAuthenticatedUserId } from '@/lib/api-auth'
import { dynamoDBUsers } from '@/lib/dynamodb'
import {
  assertPaidTier,
  buildMetadata,
  getPriceIdForTier,
  getReturnUrls,
  getStripe,
} from '@/lib/stripe-server'

export const runtime = 'nodejs'

const requestSchema = z.object({
  tier: z.enum(['starter', 'pro', 'elite']),
})

export async function POST(req: NextRequest) {
  try {
    const auth = await getAuthenticatedUserId()
    if ('error' in auth) return auth.error
    const { userId } = auth

    // Safe JSON parsing to prevent malformed requests from crashing
    let body
    try {
      body = await req.json()
    } catch (error) {
      return NextResponse.json({ error: 'Invalid JSON in request body' }, { status: 400 })
    }

    const parsed = requestSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
    }

    const tier = assertPaidTier(parsed.data.tier)
    const stripe = getStripe()

    const user = await dynamoDBUsers.get(userId)
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    let customerId = user.stripeCustomerId?.trim() || null

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        name: `${user.firstName || ''} ${user.lastName || ''}`.trim() || undefined,
        metadata: { userId },
      })
      customerId = customer.id

      await dynamoDBUsers.upsert({ id: userId, email: user.email, stripeCustomerId: customerId })
    }

    const priceId = getPriceIdForTier(tier)

    if (!priceId) {
      return NextResponse.json({ error: 'Price ID not configured for this tier' }, { status: 500 })
    }

    const { successUrl, cancelUrl } = getReturnUrls()
    const metadata = buildMetadata(userId, tier)
    const idempotencyKey = req.headers.get('Idempotency-Key') || randomUUID()

    const checkoutSession = await stripe.checkout.sessions.create(
      {
        ui_mode: 'hosted',
        mode: 'subscription',
        customer: customerId,
        payment_method_types: ['card'],
        billing_address_collection: 'auto',
        allow_promotion_codes: true,
        client_reference_id: userId,
        line_items: [{ price: priceId, quantity: 1 }],
        success_url: successUrl,
        cancel_url: cancelUrl,
        metadata,
        subscription_data: {
          metadata,
        },
        customer_update: {
          address: 'auto',
          name: 'auto',
        },
      },
      { idempotencyKey }
    )

    return NextResponse.json({ url: checkoutSession.url })
  } catch (error) {
    console.error('Stripe checkout error:', error)
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    )
  }
}
