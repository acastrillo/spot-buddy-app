import { NextRequest, NextResponse } from "next/server";
import { getServerSession, Session } from "next-auth";
import { authOptions } from "@/lib/auth-options";

/**
 * Safely extracts and validates the authenticated user ID from the session.
 *
 * This utility replaces unsafe type assertions like `(session?.user as any)?.id`
 * with proper type safety and consistent error handling.
 *
 * @param request - The Next.js request object (optional, for future middleware use)
 * @returns Object with either userId or error response
 *
 * @example
 * ```typescript
 * const auth = await getAuthenticatedUserId();
 * if ('error' in auth) return auth.error;
 * const { userId } = auth;
 * ```
 */
export async function getAuthenticatedUserId(
  request?: NextRequest
): Promise<{ userId: string } | { error: NextResponse }> {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as { id?: string })?.id;

  if (!userId) {
    return {
      error: NextResponse.json(
        { error: "Unauthorized - Please sign in" },
        { status: 401 }
      ),
    };
  }

  return { userId };
}

/**
 * Extended version that returns the full session along with userId.
 * Useful when you need additional user information beyond just the ID.
 *
 * @returns Object with userId, session, or error response
 *
 * @example
 * ```typescript
 * const auth = await getAuthenticatedSession();
 * if ('error' in auth) return auth.error;
 * const { userId, session } = auth;
 * console.log(session.user.email);
 * ```
 */
export async function getAuthenticatedSession(): Promise<
  { userId: string; session: Session } | { error: NextResponse }
> {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as { id?: string })?.id;

  if (!userId || !session) {
    return {
      error: NextResponse.json(
        { error: "Unauthorized - Please sign in" },
        { status: 401 }
      ),
    };
  }

  return { userId, session };
}

/**
 * Type guard to check if auth result contains an error.
 *
 * @example
 * ```typescript
 * const auth = await getAuthenticatedUserId();
 * if (isAuthError(auth)) return auth.error;
 * // TypeScript now knows auth has userId
 * ```
 */
export function isAuthError<T extends { error: NextResponse }>(
  auth: T | { userId: string }
): auth is T {
  return 'error' in auth;
}
