/**
 * Test endpoint for AWS Bedrock connection
 * GET /api/ai/test-connection
 */
import { NextResponse } from 'next/server';
import { getModelId, testBedrockConnection } from '@/lib/ai/bedrock-client';

export async function GET() {
  try {
    console.log('[AI Test] Testing Bedrock connection...');

    const isHealthy = await testBedrockConnection();

    if (!isHealthy) {
      return NextResponse.json(
        {
          success: false,
          error: 'Bedrock connection test failed. Response was not "OK".'
        },
        { status: 500 }
      );
    }

    console.log('[AI Test] ✓ Bedrock connection successful');

    return NextResponse.json({
      success: true,
      message: 'AWS Bedrock connection is healthy',
      model: getModelId(),
      region: process.env.AWS_BEDROCK_REGION || process.env.AWS_REGION || 'us-east-1',
    });
  } catch (error) {
    console.error('[AI Test] Error testing Bedrock connection:', error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        details: 'Check AWS credentials, region, and Bedrock model access permissions'
      },
      { status: 500 }
    );
  }
}
