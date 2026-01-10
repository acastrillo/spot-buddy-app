/**
 * Safe logging utilities that sanitize sensitive data in production
 */

const isProd = process.env.NODE_ENV === 'production';

/**
 * Mask an email address for production logs
 * dev@example.com -> d**@e******.com
 */
export function maskEmail(email: string | null | undefined): string {
  if (!email) return '[no-email]';
  if (!isProd) return email;

  const [local, domain] = email.split('@');
  if (!domain) return '[invalid-email]';

  const maskedLocal = local.length > 1 ? local[0] + '**' : '**';
  const domainParts = domain.split('.');
  const maskedDomain = domainParts.map(part =>
    part.length > 1 ? part[0] + '*'.repeat(Math.min(part.length - 1, 6)) : part
  ).join('.');

  return `${maskedLocal}@${maskedDomain}`;
}

/**
 * Mask a token/secret for production logs
 * Shows only first 4 characters in production
 */
export function maskToken(token: string | null | undefined): string {
  if (!token) return '[no-token]';
  if (!isProd) return token;

  return token.substring(0, 4) + '***';
}

/**
 * Mask a user ID for production logs
 * Shows only first 8 characters in production
 */
export function maskUserId(userId: string | null | undefined): string {
  if (!userId) return '[no-id]';
  if (!isProd) return userId;

  return userId.substring(0, 8) + '***';
}

/**
 * Safe console.log that works in both dev and production
 */
export const safeLog = {
  /**
   * Log with automatic email masking
   */
  withEmail(prefix: string, email: string | null | undefined, ...rest: any[]) {
    console.log(prefix, maskEmail(email), ...rest);
  },

  /**
   * Log with automatic token masking
   */
  withToken(prefix: string, token: string | null | undefined, ...rest: any[]) {
    console.log(prefix, maskToken(token), ...rest);
  },

  /**
   * Log with automatic user ID masking
   */
  withUserId(prefix: string, userId: string | null | undefined, ...rest: any[]) {
    console.log(prefix, maskUserId(userId), ...rest);
  },

  /**
   * Log error with automatic email masking
   */
  errorWithEmail(prefix: string, email: string | null | undefined, error: any) {
    console.error(prefix, maskEmail(email), error);
  },
};
