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
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  // Clone the response
  const response = NextResponse.next()

  // Strict-Transport-Security (HSTS)
  // Forces browsers to use HTTPS for all future requests (1 year)
  // Prevents MITM attacks by disallowing HTTP connections
  if (process.env.NODE_ENV === "production") {
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
  // Note: Next.js requires 'unsafe-eval' for dynamic imports
  // TODO: Tighten CSP as you identify safe sources
  const cspDirectives = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-eval' 'unsafe-inline'",  // unsafe-inline needed for Next.js
    "style-src 'self' 'unsafe-inline'",  // unsafe-inline needed for styled components
    "img-src 'self' data: https: blob:",  // Allow images from HTTPS, data URIs, and blobs
    "font-src 'self' data:",  // Allow fonts from self and data URIs
    "connect-src 'self' https://*.amazonaws.com https://accounts.google.com https://www.facebook.com https://graph.facebook.com",  // Allow AWS, Google, and Facebook OAuth
    "frame-ancestors 'none'",  // Equivalent to X-Frame-Options: DENY
    "base-uri 'self'",  // Restrict <base> tag to same origin
    "form-action 'self'",  // Allow form submissions to same origin
    "upgrade-insecure-requests",  // Automatically upgrade HTTP to HTTPS
  ].join('; ')

  response.headers.set('Content-Security-Policy', cspDirectives)

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
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:jpg|jpeg|gif|png|svg|ico|webp)).*)',
  ],
}
