import { randomUUID } from 'crypto'
import { NextRequest, NextResponse } from 'next/server'
import { hash } from 'bcryptjs'
import { z } from 'zod'
import { dynamoDBUsers } from '@/lib/dynamodb'
import { maskEmail } from '@/lib/safe-logger'
import { checkRateLimit } from '@/lib/rate-limit'
import { getRequestIp } from '@/lib/request-ip'

export const runtime = 'nodejs'

const signupSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .regex(/[^a-zA-Z0-9]/, 'Password must contain at least one special character'),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
})

export async function POST(req: NextRequest) {
  try {
    console.log('[Signup] Request received')

    const rateLimit = await checkRateLimit(getRequestIp(req.headers), 'auth:login')
    if (!rateLimit.success) {
      return NextResponse.json(
        {
          error: 'Too many signup attempts',
          message: 'Please wait before creating another account.',
          limit: rateLimit.limit,
          remaining: rateLimit.remaining,
          reset: rateLimit.reset,
        },
        {
          status: 429,
          headers: {
            'X-RateLimit-Limit': rateLimit.limit.toString(),
            'X-RateLimit-Remaining': rateLimit.remaining.toString(),
            'X-RateLimit-Reset': rateLimit.reset.toString(),
            'Retry-After': Math.ceil((rateLimit.reset - Date.now()) / 1000).toString(),
          },
        }
      )
    }

    const body = await req.json()
    console.log('[Signup] Request body parsed:', { email: maskEmail(body.email), hasPassword: !!body.password })

    const parsed = signupSchema.safeParse(body)

    if (!parsed.success) {
      console.error('[Signup] Validation failed:', parsed.error.errors)
      return NextResponse.json(
        { error: parsed.error.errors[0].message },
        { status: 400 }
      )
    }

    const { email, password, firstName, lastName } = parsed.data
    const responseMessage = 'If this email is available, your account has been created. Please sign in.'

    // Hash password before existence check to reduce timing differences
    console.log('[Signup] Hashing password...')
    const passwordHash = await hash(password, 12)
    console.log('[Signup] Password hashed successfully')

    // Check if user already exists
    console.log('[Signup] Checking for existing user:', maskEmail(email))
    const existingUser = await dynamoDBUsers.getByEmail(email)
    if (existingUser) {
      console.log('[Signup] Signup completed (existing email):', maskEmail(email))
      return NextResponse.json(
        { success: true, message: responseMessage },
        { status: 201 }
      )
    }

    // Create user in DynamoDB
    const userId = randomUUID()
    console.log('[Signup] Creating user in DynamoDB:', userId, maskEmail(email))

    await dynamoDBUsers.upsert({
      id: userId,
      email,
      passwordHash,
      firstName: firstName || null,
      lastName: lastName || null,
      emailVerified: new Date().toISOString(), // Auto-verify for email/password signups
    })

    console.log(`[Signup] ✓ Created new user: ${userId} (${maskEmail(email)})`)

    return NextResponse.json(
      { success: true, message: responseMessage },
      { status: 201 }
    )

  } catch (error) {
    console.error('[Signup] Error details:', error)
    console.error('[Signup] Error stack:', error instanceof Error ? error.stack : 'No stack trace')
    console.error('[Signup] Error message:', error instanceof Error ? error.message : String(error))

    return NextResponse.json(
      {
        error: 'Failed to create account',
        details: process.env.NODE_ENV === 'development'
          ? (error instanceof Error ? error.message : String(error))
          : undefined
      },
      { status: 500 }
    )
  }
}
