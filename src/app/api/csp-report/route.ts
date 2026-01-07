import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    if (body) {
      console.warn('[CSP] Report:', body);
    }
  } catch (error) {
    console.warn('[CSP] Report read failed:', error);
  }

  return new NextResponse(null, { status: 204 });
}
