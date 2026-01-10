/**
 * Next.js Middleware for Security Headers
 *
 * This middleware adds security headers to all responses to protect against:
 * - XSS (Cross-Site Scripting) attacks
 * - Clickjacking attacks
 * - MITM (Man-in-the-Middle) attacks
 * - MIME type sniffing
 *
 * Applied to all routes except static assets and API routes.
 */

import { NextResponse } from 'next/server'

export function middleware() {
  // Clone the response
  const response = NextResponse.next()
  const isProduction = process.env.NODE_ENV === "production"

  // Cache-Control for HTML pages
  // Prevent caching of HTML to ensure fresh chunks are always loaded after deployments
  // This is critical for avoiding ChunkLoadError after deployments
  // Delete any existing cache headers first, then set our strict no-cache policy
  response.headers.delete('Cache-Control')
  response.headers.delete('Pragma')
  response.headers.delete('Expires')
  response.headers.delete('Surrogate-Control')
  response.headers.set('Cache-Control', 'private, no-cache, no-store, must-revalidate, max-age=0')
  response.headers.set('Surrogate-Control', 'no-store')
  response.headers.set('Pragma', 'no-cache')
  response.headers.set('Expires', '0')

  // Strict-Transport-Security (HSTS)
  // Forces browsers to use HTTPS for all future requests (1 year)
  // Prevents MITM attacks by disallowing HTTP connections
  if (isProduction) {
    response.headers.set(
      'Strict-Transport-Security',
      'max-age=31536000; includeSubDomains; preload'
    )
  }

  // X-Frame-Options
  // Prevents clickjacking by disallowing the page to be embedded in iframes
  response.headers.set('X-Frame-Options', 'DENY')

  // X-Content-Type-Options
  // Prevents MIME type sniffing (forces browser to respect Content-Type header)
  response.headers.set('X-Content-Type-Options', 'nosniff')

  // Referrer-Policy
  // Controls how much referrer information is sent with requests
  // 'strict-origin-when-cross-origin' balances privacy and functionality
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')

  // X-XSS-Protection
  // Legacy header for older browsers (modern browsers use CSP instead)
  response.headers.set('X-XSS-Protection', '1; mode=block')

  // Content-Security-Policy (CSP)
  // Prevents XSS attacks by controlling what resources can load
  // Note: Next.js with Turbopack requires 'unsafe-eval' for HMR and dynamic imports
  const cspDirectives = [
    "default-src 'self'",
    // Next.js requires 'unsafe-eval' for dynamic imports (Turbopack)
    // 'unsafe-inline' is still needed for some Next.js internals
    // Consider using nonces in production for better security
    isProduction
      ? "script-src 'self' 'unsafe-inline' https://js.stripe.com"
      : "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://js.stripe.com",
    // 'unsafe-inline' needed for Tailwind and styled components
    // Consider extracting critical CSS and using nonces for inline styles
    "style-src 'self' 'unsafe-inline'",
    // Tightened: Only allow images from specific trusted sources
    "img-src 'self' data: blob: https://*.amazonaws.com https://lh3.googleusercontent.com https://platform-lookaside.fbsbx.com https://graph.facebook.com",
    "font-src 'self' data:",
    "media-src 'self' data: blob: https://ssl.gstatic.com",
    // Added Stripe API domains for checkout and webhooks
    "connect-src 'self' https://*.amazonaws.com https://accounts.google.com https://www.facebook.com https://graph.facebook.com https://api.stripe.com https://checkout.stripe.com",
    // Prevent object/embed/applet elements (Flash, Java, etc.)
    "object-src 'none'",
    // Allow web workers from same origin
    "worker-src 'self' blob:",
    // Prevent framing (clickjacking protection)
    "frame-ancestors 'none'",
    // Allow Stripe checkout iframes
    "frame-src https://js.stripe.com https://checkout.stripe.com",
    "base-uri 'self'",
    // Allow form submissions to self and Stripe
    "form-action 'self' https://checkout.stripe.com",
    "upgrade-insecure-requests",
  ].join('; ')

  response.headers.set('Content-Security-Policy', cspDirectives)

  if (isProduction) {
    const reportOnlyDirectives = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' https://js.stripe.com",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https://*.amazonaws.com https://lh3.googleusercontent.com https://platform-lookaside.fbsbx.com https://graph.facebook.com",
      "font-src 'self' data:",
      "media-src 'self' data: blob: https://ssl.gstatic.com",
      "connect-src 'self' https://*.amazonaws.com https://accounts.google.com https://www.facebook.com https://graph.facebook.com https://api.stripe.com https://checkout.stripe.com",
      "object-src 'none'",
      "worker-src 'self' blob:",
      "frame-ancestors 'none'",
      "frame-src https://js.stripe.com https://checkout.stripe.com",
      "base-uri 'self'",
      "form-action 'self' https://checkout.stripe.com",
      "upgrade-insecure-requests",
      "report-uri /api/csp-report",
    ].join('; ')

    response.headers.set('Content-Security-Policy-Report-Only', reportOnlyDirectives)
  }

  // Permissions-Policy (formerly Feature-Policy)
  // Controls which browser features and APIs can be used
  const permissionsPolicy = [
    'camera=()',  // Disable camera access
    'microphone=()',  // Disable microphone access
    'geolocation=()',  // Disable geolocation
    'payment=()',  // Disable payment API
    'usb=()',  // Disable USB access
    'magnetometer=()',  // Disable magnetometer
  ].join(', ')

  response.headers.set('Permissions-Policy', permissionsPolicy)

  return response
}

// Configure which routes to apply middleware to
// Exclude: API routes, Next.js internals, static files
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico (favicon)
     * - public files (images, etc.)
     */
    '/',  // Explicitly match root
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:jpg|jpeg|gif|png|svg|ico|webp)).+)',  // Changed .* to .+ to require at least one char
  ],
}
