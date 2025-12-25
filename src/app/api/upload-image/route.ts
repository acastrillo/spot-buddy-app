// app/api/upload-image/route.ts
export const runtime = 'nodejs';
import { NextResponse } from 'next/server';
import { getAuthenticatedUserId } from '@/lib/api-auth';
import { uploadWorkoutImage, getWorkoutImageUrl } from '@/lib/s3';
import { checkRateLimit } from '@/lib/rate-limit';

// File validation constants
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

function validateImageSignature(header: Uint8Array): boolean {
  // Check JPEG
  if (header[0] === 0xFF && header[1] === 0xD8 && header[2] === 0xFF) return true;
  // Check PNG
  if (header[0] === 0x89 && header[1] === 0x50 && header[2] === 0x4E && header[3] === 0x47) return true;
  // Check WebP (RIFF)
  if (header[0] === 0x52 && header[1] === 0x49 && header[2] === 0x46 && header[3] === 0x46) return true;
  return false;
}

export async function POST(req: Request) {
  try {
    // SECURITY FIX: Use new auth utility
    const auth = await getAuthenticatedUserId();
    if ('error' in auth) return auth.error;
    const { userId } = auth;

    // RATE LIMITING: Check rate limit (20 uploads per hour)
    const rateLimit = await checkRateLimit(userId, 'api:upload');
    if (!rateLimit.success) {
      return NextResponse.json(
        {
          error: 'Too many upload requests',
          message: 'You have exceeded the upload rate limit. Please try again later.',
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
      );
    }

    const form = await req.formData();
    const file = form.get('file');
    const workoutId = form.get('workoutId') as string;

    if (!(file instanceof Blob)) {
      return NextResponse.json({ error: 'file is required' }, { status: 400 });
    }

    if (!workoutId) {
      return NextResponse.json({ error: 'workoutId is required' }, { status: 400 });
    }

    // SECURITY FIX: Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({
        error: 'File too large',
        message: `Maximum file size is ${MAX_FILE_SIZE / 1024 / 1024}MB`
      }, { status: 400 });
    }

    // SECURITY FIX: Validate MIME type
    if (file instanceof File && !ALLOWED_MIME_TYPES.includes(file.type)) {
      return NextResponse.json({
        error: 'Invalid file type',
        message: 'Only JPEG, PNG, and WebP images are allowed'
      }, { status: 400 });
    }

    // SECURITY FIX: Validate magic bytes (actual file content)
    const arrayBuffer = await file.arrayBuffer();
    const header = new Uint8Array(arrayBuffer.slice(0, 4));
    if (!validateImageSignature(header)) {
      return NextResponse.json({
        error: 'Invalid image file',
        message: 'File does not appear to be a valid image'
      }, { status: 400 });
    }

    // Convert to buffer (reuse arrayBuffer to avoid double read)
    const bytes = Buffer.from(arrayBuffer);
    const filename = file instanceof File ? file.name : 'upload.jpg';

    // Upload to S3
    const key = await uploadWorkoutImage(bytes, userId, workoutId, filename);
    const url = getWorkoutImageUrl(key);

    return NextResponse.json({
      key,
      url,
      message: 'Image uploaded successfully',
    });
  } catch (err: unknown) {
    console.error('Image upload error:', err);
    return NextResponse.json(
      { error: String((err as Error)?.message || err) },
      { status: 500 }
    );
  }
}
