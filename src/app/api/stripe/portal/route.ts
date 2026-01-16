import { NextResponse } from 'next/server'
import { getAuthenticatedUserId } from '@/lib/api-auth'
import { dynamoDBUsers } from '@/lib/dynamodb'
import { getReturnUrls, getStripe } from '@/lib/stripe-server'
import { getSystemSettings } from '@/lib/system-settings'

export const runtime = 'nodejs'

export async function POST() {
  try {
    const auth = await getAuthenticatedUserId()
    if ('error' in auth) return auth.error
    const { userId } = auth

    const user = await dynamoDBUsers.get(userId)
    if (!user || !user.stripeCustomerId) {
      return NextResponse.json({ error: 'No subscription found' }, { status: 404 })
    }

    const systemSettings = await getSystemSettings()
    if (user.isBeta && systemSettings.globalBetaMode) {
      return NextResponse.json(
        { error: 'Billing portal access is disabled for beta users during the beta period.' },
        { status: 403 }
      )
    }

    const stripe = getStripe()
    const { successUrl } = getReturnUrls()

    const portalSession = await stripe.billingPortal.sessions.create({
      customer: user.stripeCustomerId,
      return_url: successUrl,
    })

    return NextResponse.json({ url: portalSession.url })
  } catch (error) {
    console.error('Stripe portal error:', error)
    return NextResponse.json(
      { error: 'Failed to create portal session' },
      { status: 500 }
    )
  }
}
