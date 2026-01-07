import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

// Cache the build ID since it won't change during runtime
let cachedBuildId: string | null = null;

function getBuildId(): string {
  if (cachedBuildId) {
    return cachedBuildId;
  }

  // Try to read Next.js BUILD_ID
  const buildIdPaths = [
    path.join(process.cwd(), '.next', 'BUILD_ID'),
    path.join(process.cwd(), 'BUILD_ID'),
    '/app/.next/BUILD_ID',
  ];

  for (const buildIdPath of buildIdPaths) {
    try {
      if (fs.existsSync(buildIdPath)) {
        cachedBuildId = fs.readFileSync(buildIdPath, 'utf8').trim();
        return cachedBuildId;
      }
    } catch {
      // Continue to next path
    }
  }

  // Fallback to a timestamp-based ID from when the server started
  cachedBuildId = process.env.BUILD_ID || `build-${Date.now()}`;
  return cachedBuildId;
}

export async function GET() {
  const buildId = getBuildId();

  return NextResponse.json(
    { buildId },
    {
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    }
  );
}
