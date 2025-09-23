// app/api/ocr/route.ts
export const runtime = 'nodejs'; // ensure Node runtime (AWS SDK needs Node)
import { NextResponse } from 'next/server';
import { TextractClient, DetectDocumentTextCommand } from '@aws-sdk/client-textract';

const client = new TextractClient({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: process.env.AWS_ACCESS_KEY_ID
    ? {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
        sessionToken: process.env.AWS_SESSION_TOKEN,
      }
    : undefined,
});

export async function POST(req: Request) {
  try {
    const form = await req.formData(); // supported by Route Handlers
    const file = form.get('file');
    if (!(file instanceof Blob)) {
      return NextResponse.json({ error: 'file is required' }, { status: 400 });
    }

    const bytes = Buffer.from(await file.arrayBuffer());
    const cmd = new DetectDocumentTextCommand({
      Document: { Bytes: bytes }, // Textract allows bytes or S3Object
    });
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

    return NextResponse.json({ text, confidence });
  } catch (err: unknown) {
    return NextResponse.json({ error: String((err as Error)?.message || err) }, { status: 500 });
  }
}