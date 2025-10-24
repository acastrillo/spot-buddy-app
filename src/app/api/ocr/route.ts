// app/api/ocr/route.ts
export const runtime = 'nodejs'; // ensure Node runtime (AWS SDK needs Node)
import { NextResponse } from 'next/server';
import { TextractClient, DetectDocumentTextCommand } from '@aws-sdk/client-textract';
import { getAuthenticatedUserId } from '@/lib/api-auth';
import { dynamoDBUsers } from '@/lib/dynamodb';
import { getQuotaLimit } from '@/lib/stripe';
import type { SubscriptionTier } from '@/lib/feature-gating';
import { checkRateLimit } from '@/lib/rate-limit';

// Helper function to create Textract client lazily
function getTextractClient() {
  return new TextractClient({
    region: process.env.AWS_REGION || 'us-east-1',
    credentials: process.env.AWS_ACCESS_KEY_ID
      ? {
          accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
          sessionToken: process.env.AWS_SESSION_TOKEN,
        }
      : undefined, // Falls back to AWS CLI credentials
  });
}

export async function POST(req: Request) {
  try {
    // SECURITY FIX: Use new auth utility
    const auth = await getAuthenticatedUserId();
    if ('error' in auth) return auth.error;
    const { userId } = auth;

    // RATE LIMITING: Check rate limit (10 OCR requests per hour)
    const rateLimit = await checkRateLimit(userId, 'api:ocr');
    if (!rateLimit.success) {
      return NextResponse.json(
        {
          error: 'Too many OCR requests',
          message: 'You have exceeded the rate limit for OCR processing. Please try again later.',
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
          },
        }
      );
    }

    // Check OCR quota
    const user = await dynamoDBUsers.get(userId);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Get quota limit based on subscription tier
    const tier = (user.subscriptionTier || 'free') as SubscriptionTier;
    const weeklyLimit = getQuotaLimit(tier, 'ocrQuotaWeekly');

    // Check if user has unlimited quota (null limit means unlimited for pro/elite)
    if (weeklyLimit !== null && user.ocrQuotaUsed >= weeklyLimit) {
      return NextResponse.json(
        {
          error: 'OCR quota exceeded',
          message: 'You have reached your weekly OCR limit. Upgrade your subscription for more scans.',
          quotaUsed: user.ocrQuotaUsed,
          quotaLimit: weeklyLimit,
          subscriptionTier: user.subscriptionTier
        },
        { status: 429 }
      );
    }

    const form = await req.formData(); // supported by Route Handlers
    const file = form.get('file');
    if (!(file instanceof Blob)) {
      return NextResponse.json({ error: 'file is required' }, { status: 400 });
    }

    const bytes = Buffer.from(await file.arrayBuffer());
    const cmd = new DetectDocumentTextCommand({
      Document: { Bytes: bytes }, // Textract allows bytes or S3Object
    });

    // Initialize client only when needed (lazy loading)
    const client = getTextractClient();
    const out = await client.send(cmd);

    // Concatenate detected LINE blocks into text; average confidence if present
    const lines = (out.Blocks || [])
      .filter(b => b.BlockType === 'LINE' && b.Text)
      .map(b => ({ text: b.Text!, conf: b.Confidence ?? undefined }));

    const text = lines.map(l => l.text).join('\n');
    const confidence =
      lines.length
        ? Math.round((lines.reduce((s, l) => s + (l.conf ?? 0), 0) / lines.length) * 10) / 10
        : undefined;

    // Increment OCR usage
    try {
      await dynamoDBUsers.incrementOCRUsage(userId);
    } catch (error) {
      console.error('Failed to increment OCR usage:', error);
      // Don't fail the request if quota tracking fails
    }

    // Get updated quota info
    const updatedUser = await dynamoDBUsers.get(userId);
    const currentLimit = getQuotaLimit(tier, 'ocrQuotaWeekly');

    return NextResponse.json({
      text,
      confidence,
      quotaUsed: updatedUser?.ocrQuotaUsed ?? user.ocrQuotaUsed + 1,
      quotaLimit: currentLimit,
      isUnlimited: currentLimit === null
    });
  } catch (err: unknown) {
    return NextResponse.json({ error: String((err as Error)?.message || err) }, { status: 500 });
  }
}
