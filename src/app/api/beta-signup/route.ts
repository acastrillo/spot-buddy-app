import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { sendBetaSignupAlert } from "@/lib/email-service"
import { checkRateLimit } from "@/lib/rate-limit"
import { getRequestIp } from "@/lib/request-ip"
import { maskEmail } from "@/lib/safe-logger"

export const runtime = "nodejs"

const betaSignupSchema = z.object({
  firstName: z.string().trim().min(1, "First name is required").max(100),
  lastName: z.string().trim().max(100).optional(),
  email: z.string().trim().email("Invalid email address").max(254),
})

export async function POST(req: NextRequest) {
  try {
    const rateLimit = await checkRateLimit(getRequestIp(req.headers), "api:write")
    if (!rateLimit.success) {
      return NextResponse.json(
        {
          error: "Too many requests",
          message: "Please wait before trying again.",
          limit: rateLimit.limit,
          remaining: rateLimit.remaining,
          reset: rateLimit.reset,
        },
        {
          status: 429,
          headers: {
            "X-RateLimit-Limit": rateLimit.limit.toString(),
            "X-RateLimit-Remaining": rateLimit.remaining.toString(),
            "X-RateLimit-Reset": rateLimit.reset.toString(),
            "Retry-After": Math.ceil((rateLimit.reset - Date.now()) / 1000).toString(),
          },
        }
      )
    }

    const body = await req.json()
    const parsed = betaSignupSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0]?.message || "Invalid request" },
        { status: 400 }
      )
    }

    const { firstName, lastName, email } = parsed.data

    console.log("[BetaSignup] Request received:", { email: maskEmail(email) })

    await sendBetaSignupAlert({
      firstName,
      lastName,
      email,
      createdAt: new Date().toISOString(),
    })

    return NextResponse.json({ success: true }, { status: 200 })
  } catch (error) {
    console.error("[BetaSignup] Error handling request:", error)
    return NextResponse.json(
      { error: "Unable to submit right now. Please try again." },
      { status: 500 }
    )
  }
}
