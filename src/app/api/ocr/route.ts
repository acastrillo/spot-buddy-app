// app/api/ocr/route.ts
export const runtime = 'nodejs'; // ensure Node runtime (AWS SDK needs Node)
import { NextResponse } from 'next/server';
import { TextractClient, DetectDocumentTextCommand } from '@aws-sdk/client-textract';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { dynamoDBUsers } from '@/lib/dynamodb';

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
    // Check authentication
    const session = await getServerSession(authOptions);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (!(session?.user as any)?.id) {
      console.error('OCR Auth failed:', { session, user: session?.user });
      return NextResponse.json({
        error: 'Unauthorized',
        message: 'Please log in again to use OCR features'
      }, { status: 401 });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const userId = (session.user as any).id as string;

    // Check OCR quota
    const user = await dynamoDBUsers.get(userId);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (user.ocrQuotaUsed >= user.ocrQuotaLimit) {
      return NextResponse.json(
        {
          error: 'OCR quota exceeded',
          quotaUsed: user.ocrQuotaUsed,
          quotaLimit: user.ocrQuotaLimit,
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

    return NextResponse.json({
      text,
      confidence,
      quotaUsed: updatedUser?.ocrQuotaUsed ?? user.ocrQuotaUsed + 1,
      quotaLimit: updatedUser?.ocrQuotaLimit ?? user.ocrQuotaLimit
    });
  } catch (err: unknown) {
    return NextResponse.json({ error: String((err as Error)?.message || err) }, { status: 500 });
  }
}
