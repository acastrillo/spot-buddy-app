import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUserId } from '@/lib/api-auth'
import { stripe, SUBSCRIPTION_TIERS } from '@/lib/stripe'
import { dynamoDBUsers } from '@/lib/dynamodb'

export async function POST(req: NextRequest) {
  try {
    // SECURITY FIX: Use new auth utility
    const auth = await getAuthenticatedUserId();
    if ('error' in auth) return auth.error;
    const { userId } = auth;

    const { tier } = await req.json()

    // Validate tier
    if (!['starter', 'pro', 'elite'].includes(tier)) {
      return NextResponse.json({ error: 'Invalid subscription tier' }, { status: 400 })
    }

    // Get user from DynamoDB
    const user = await dynamoDBUsers.get(userId)
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Get or create Stripe customer
    let customerId = user.stripeCustomerId

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        name: `${user.firstName || ''} ${user.lastName || ''}`.trim() || undefined,
        metadata: {
          userId: user.id,
        },
      })
      customerId = customer.id

      // Update user with Stripe customer ID
      await dynamoDBUsers.upsert({ id: userId, email: user.email, stripeCustomerId: customerId })
    }

    const tierConfig = SUBSCRIPTION_TIERS[tier as keyof typeof SUBSCRIPTION_TIERS]
    const priceId = tierConfig.priceId

    if (!priceId) {
      return NextResponse.json({ error: 'Price ID not configured for this tier' }, { status: 500 })
    }

    // Create Stripe checkout session
    const checkoutSession = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: `${process.env.NEXTAUTH_URL}/settings?session_id={CHECKOUT_SESSION_ID}&success=true`,
      cancel_url: `${process.env.NEXTAUTH_URL}/settings?canceled=true`,
      metadata: {
        userId: user.id,
        tier,
      },
      subscription_data: {
        metadata: {
          userId: user.id,
          tier,
        },
      },
    })

    return NextResponse.json({ url: checkoutSession.url })
  } catch (error) {
    console.error('Stripe checkout error:', error)
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    )
  }
}
