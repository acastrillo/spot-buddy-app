// app/api/upload-image/route.ts
export const runtime = 'nodejs';
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { uploadWorkoutImage, getWorkoutImageUrl } from '@/lib/s3';

export async function POST(req: Request) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (!(session?.user as any)?.id) {
      console.error('Upload-image Auth failed:', { session, user: session?.user });
      return NextResponse.json({
        error: 'Unauthorized',
        message: 'Please log in again to upload images'
      }, { status: 401 });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const userId = (session.user as any).id as string;

    const form = await req.formData();
    const file = form.get('file');
    const workoutId = form.get('workoutId') as string;

    if (!(file instanceof Blob)) {
      return NextResponse.json({ error: 'file is required' }, { status: 400 });
    }

    if (!workoutId) {
      return NextResponse.json({ error: 'workoutId is required' }, { status: 400 });
    }

    // Convert to buffer
    const bytes = Buffer.from(await file.arrayBuffer());
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
