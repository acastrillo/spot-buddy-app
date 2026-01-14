import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';

// Lazy-load SES client
let sesClient: SESClient | null = null;
function getSESClient(): SESClient {
  if (!sesClient) {
    sesClient = new SESClient({
      region: process.env.AWS_SES_REGION || process.env.AWS_REGION || 'us-east-1',
    });
  }
  return sesClient;
}

interface SignupAlertData {
  email: string;
  firstName?: string | null;
  lastName?: string | null;
  id: string;
  provider: string;
  createdAt: string;
}

interface BetaSignupAlertData {
  email: string;
  firstName: string;
  lastName: string;
  createdAt: string;
}

/**
 * Send a signup alert email to the admin using AWS SES
 * Uses retry logic with exponential backoff (3 attempts)
 * Non-blocking - failures are logged but not thrown
 */
export async function sendSignupAlert(user: SignupAlertData): Promise<void> {
  const ADMIN_EMAIL = process.env.ADMIN_EMAIL;
  const EMAIL_FROM = process.env.EMAIL_FROM || process.env.SES_FROM_EMAIL || 'notifications@kinexfit.com';
  const MAX_RETRIES = parseInt(process.env.EMAIL_RETRY_ATTEMPTS || '3');

  if (!ADMIN_EMAIL) {
    console.warn('[Email] No ADMIN_EMAIL configured - skipping signup alert');
    return;
  }

  const userName = [user.firstName, user.lastName]
    .filter(Boolean)
    .join(' ') || 'N/A';

  const providerName = formatProviderName(user.provider);
  const signupTime = new Date(user.createdAt).toUTCString();

  // Build admin dashboard URL with pre-filled search
  const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
  const dashboardUrl = `${baseUrl}/admin/users?search=${encodeURIComponent(user.email)}`;

  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 8px 8px 0 0; }
          .header h1 { margin: 0; font-size: 24px; }
          .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
          .info-row { display: flex; padding: 12px 0; border-bottom: 1px solid #e5e7eb; }
          .info-label { font-weight: 600; width: 150px; color: #6b7280; }
          .info-value { flex: 1; color: #111827; }
          .button { display: inline-block; background: #667eea; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 20px; }
          .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🎉 New User Signup</h1>
          </div>
          <div class="content">
            <div class="info-row">
              <div class="info-label">Email:</div>
              <div class="info-value"><strong>${user.email}</strong></div>
            </div>
            <div class="info-row">
              <div class="info-label">Name:</div>
              <div class="info-value">${userName}</div>
            </div>
            <div class="info-row">
              <div class="info-label">User ID:</div>
              <div class="info-value"><code>${user.id}</code></div>
            </div>
            <div class="info-row">
              <div class="info-label">Provider:</div>
              <div class="info-value">${providerName}</div>
            </div>
            <div class="info-row">
              <div class="info-label">Signup Time:</div>
              <div class="info-value">${signupTime}</div>
            </div>
            <div class="info-row">
              <div class="info-label">Subscription:</div>
              <div class="info-value">Free (default)</div>
            </div>
            <a href="${dashboardUrl}" class="button">View in Admin Dashboard →</a>
          </div>
          <div class="footer">
            <p>Automated alert from Spot Buddy</p>
          </div>
        </div>
      </body>
    </html>
  `;

  const textContent = `
New User Signup Alert

Email: ${user.email}
Name: ${userName}
User ID: ${user.id}
Provider: ${providerName}
Signup Time: ${signupTime}
Subscription Tier: free

View in Admin Dashboard: ${dashboardUrl}
  `.trim();

  // Retry logic with exponential backoff
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const command = new SendEmailCommand({
        Source: EMAIL_FROM,
        Destination: {
          ToAddresses: [ADMIN_EMAIL],
        },
        Message: {
          Subject: {
            Data: `New User Signup: ${user.email}`,
            Charset: 'UTF-8',
          },
          Body: {
            Html: {
              Data: htmlContent,
              Charset: 'UTF-8',
            },
            Text: {
              Data: textContent,
              Charset: 'UTF-8',
            },
          },
        },
      });

      const result = await getSESClient().send(command);

      console.log(
        `[Email] ✓ Signup alert sent to ${maskEmail(ADMIN_EMAIL)} for user ${maskEmail(user.email)} (MessageId: ${result.MessageId})`
      );
      return;
    } catch (error: any) {
      const isLastAttempt = attempt === MAX_RETRIES;

      // Log detailed error information
      console.error(
        `[Email] Failed to send signup alert (attempt ${attempt}/${MAX_RETRIES}):`,
        error.message || error
      );

      // Provide helpful error messages for common SES issues
      if (error.name === 'MessageRejected') {
        console.error('[Email] MessageRejected: Check that EMAIL_FROM is verified in SES');
      } else if (error.name === 'ConfigurationSetDoesNotExist') {
        console.error('[Email] Configuration set not found - check SES settings');
      } else if (error.message?.includes('not verified')) {
        console.error('[Email] Email address not verified. In SES sandbox mode, both sender and recipient must be verified.');
        console.error(`[Email] Verify ${EMAIL_FROM} and ${ADMIN_EMAIL} in the SES console: https://console.aws.amazon.com/ses/`);
      }

      if (!isLastAttempt) {
        // Exponential backoff: 1s, 2s, 4s
        const delayMs = Math.pow(2, attempt - 1) * 1000;
        console.log(`[Email] Retrying in ${delayMs}ms...`);
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      } else {
        // Log final failure but don't throw
        console.error(
          `[Email] ✗ All ${MAX_RETRIES} attempts failed for signup alert to ${maskEmail(ADMIN_EMAIL)}`
        );
      }
    }
  }
}

/**
 * Send a beta signup alert email to the admin using AWS SES
 * Throws if all retry attempts fail so the caller can surface an error
 */
export async function sendBetaSignupAlert(signup: BetaSignupAlertData): Promise<void> {
  const ADMIN_EMAIL = process.env.ADMIN_EMAIL;
  const EMAIL_FROM = process.env.EMAIL_FROM || process.env.SES_FROM_EMAIL || 'notifications@kinexfit.com';
  const MAX_RETRIES = parseInt(process.env.EMAIL_RETRY_ATTEMPTS || '3');

  if (!ADMIN_EMAIL) {
    throw new Error('[Email] ADMIN_EMAIL is not configured');
  }

  const userName = [signup.firstName, signup.lastName].filter(Boolean).join(' ') || 'N/A';
  const signupTime = new Date(signup.createdAt).toUTCString();

  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #00d0bd 0%, #3b82f6 100%); color: white; padding: 30px; border-radius: 8px 8px 0 0; }
          .header h1 { margin: 0; font-size: 24px; }
          .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
          .info-row { display: flex; padding: 12px 0; border-bottom: 1px solid #e5e7eb; }
          .info-label { font-weight: 600; width: 140px; color: #6b7280; }
          .info-value { flex: 1; color: #111827; }
          .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>New Beta Signup</h1>
          </div>
          <div class="content">
            <div class="info-row">
              <div class="info-label">Name:</div>
              <div class="info-value">${userName}</div>
            </div>
            <div class="info-row">
              <div class="info-label">Email:</div>
              <div class="info-value"><strong>${signup.email}</strong></div>
            </div>
            <div class="info-row">
              <div class="info-label">Signup time:</div>
              <div class="info-value">${signupTime}</div>
            </div>
          </div>
          <div class="footer">
            <p>Automated alert from Kinex Fit</p>
          </div>
        </div>
      </body>
    </html>
  `;

  const textContent = `
New Beta Signup

Name: ${userName}
Email: ${signup.email}
Signup Time: ${signupTime}
  `.trim();

  let lastError: any = null;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const command = new SendEmailCommand({
        Source: EMAIL_FROM,
        Destination: {
          ToAddresses: [ADMIN_EMAIL],
        },
        Message: {
          Subject: {
            Data: `New Beta Signup: ${signup.email}`,
            Charset: 'UTF-8',
          },
          Body: {
            Html: {
              Data: htmlContent,
              Charset: 'UTF-8',
            },
            Text: {
              Data: textContent,
              Charset: 'UTF-8',
            },
          },
        },
      });

      const result = await getSESClient().send(command);

      console.log(
        `[Email] Beta signup alert sent to ${maskEmail(ADMIN_EMAIL)} for ${maskEmail(signup.email)} (MessageId: ${result.MessageId})`
      );
      return;
    } catch (error: any) {
      lastError = error;

      console.error(
        `[Email] Failed to send beta signup alert (attempt ${attempt}/${MAX_RETRIES}):`,
        error.message || error
      );

      if (error.name === 'MessageRejected') {
        console.error('[Email] MessageRejected: Check that EMAIL_FROM is verified in SES');
      } else if (error.name === 'ConfigurationSetDoesNotExist') {
        console.error('[Email] Configuration set not found - check SES settings');
      } else if (error.message?.includes('not verified')) {
        console.error('[Email] Email address not verified. In SES sandbox mode, both sender and recipient must be verified.');
        console.error(`[Email] Verify ${EMAIL_FROM} and ${ADMIN_EMAIL} in the SES console: https://console.aws.amazon.com/ses/`);
      }

      if (attempt < MAX_RETRIES) {
        const delayMs = Math.pow(2, attempt - 1) * 1000;
        console.log(`[Email] Retrying in ${delayMs}ms...`);
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }
  }

  throw lastError || new Error('[Email] Failed to send beta signup alert');
}

/**
 * Format provider name for display
 */
function formatProviderName(provider: string): string {
  const providerMap: Record<string, string> = {
    credentials: 'Email/Password',
    google: 'Google OAuth',
    facebook: 'Facebook OAuth',
    'dev-credentials': 'Dev Login',
  };

  return providerMap[provider] || provider;
}

/**
 * Mask email for privacy in logs
 * Example: john.doe@example.com → j***e@e*****e.com
 */
function maskEmail(email: string): string {
  const [localPart, domain] = email.split('@');
  if (!domain) return email;

  const maskedLocal =
    localPart.length <= 2
      ? localPart
      : `${localPart[0]}***${localPart[localPart.length - 1]}`;

  const [domainName, tld] = domain.split('.');
  const maskedDomain =
    domainName.length <= 2
      ? domainName
      : `${domainName[0]}${'*'.repeat(Math.min(5, domainName.length - 2))}${domainName[domainName.length - 1]}`;

  return `${maskedLocal}@${maskedDomain}.${tld}`;
}
