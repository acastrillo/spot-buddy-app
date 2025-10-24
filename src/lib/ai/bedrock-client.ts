/**
 * AWS Bedrock Client for AI-Powered Features
 *
 * This module provides a centralized client for interacting with Amazon Bedrock
 * using Claude Sonnet 4.5 for workout enhancements, generation, and AI features.
 *
 * Features:
 * - Smart Workout Parser (enhance messy OCR text)
 * - AI Workout Generator (natural language  full workout)
 * - Training insights and recommendations
 *
 * Cost optimization:
 * - Prompt caching (90% cost savings on repeated context)
 * - Batch processing (50% cost savings on large operations)
 * - Streaming responses for better UX
 */

import {
  BedrockRuntimeClient,
  InvokeModelCommand,
  InvokeModelWithResponseStreamCommand,
} from '@aws-sdk/client-bedrock-runtime';

// Bedrock configuration
const BEDROCK_REGION = process.env.AWS_BEDROCK_REGION || process.env.AWS_REGION || 'us-east-1';
const MODEL_ID = 'anthropic.claude-sonnet-4-5-20250514';

// Cost tracking (approximate)
const COST_PER_INPUT_TOKEN = 0.000003; // $3 per 1M tokens
const COST_PER_OUTPUT_TOKEN = 0.000015; // $15 per 1M tokens
const COST_WITH_CACHE = 0.0000003; // 90% savings with prompt caching

/**
 * Bedrock client singleton
 */
let bedrockClient: BedrockRuntimeClient | null = null;

/**
 * Get or create Bedrock client
 */
export function getBedrockClient(): BedrockRuntimeClient {
  if (!bedrockClient) {
    bedrockClient = new BedrockRuntimeClient({
      region: BEDROCK_REGION,
      // Credentials are automatically loaded from:
      // 1. Environment variables (AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY)
      // 2. IAM role (in ECS/Lambda)
      // 3. AWS credentials file (~/.aws/credentials)
    });
  }
  return bedrockClient;
}

/**
 * Message structure for Claude
 */
export interface ClaudeMessage {
  role: 'user' | 'assistant';
  content: string;
}

/**
 * Request parameters for Bedrock invoke
 */
export interface BedrockInvokeParams {
  messages: ClaudeMessage[];
  systemPrompt?: string;
  maxTokens?: number;
  temperature?: number;
  topP?: number;
  stopSequences?: string[];
}

/**
 * Response from Bedrock
 */
export interface BedrockResponse {
  content: string;
  stopReason: string;
  usage: {
    inputTokens: number;
    outputTokens: number;
  };
  cost?: {
    input: number;
    output: number;
    total: number;
  };
}

/**
 * Invoke Claude model (non-streaming)
 *
 * @param params - Request parameters
 * @returns Response with content and usage data
 */
export async function invokeClaude(
  params: BedrockInvokeParams
): Promise<BedrockResponse> {
  const client = getBedrockClient();

  // Build request body
  const requestBody = {
    anthropic_version: 'bedrock-2023-05-31',
    max_tokens: params.maxTokens || 4096,
    messages: params.messages,
    ...(params.systemPrompt && { system: params.systemPrompt }),
    ...(params.temperature !== undefined && { temperature: params.temperature }),
    ...(params.topP !== undefined && { top_p: params.topP }),
    ...(params.stopSequences && { stop_sequences: params.stopSequences }),
  };

  try {
    const command = new InvokeModelCommand({
      modelId: MODEL_ID,
      contentType: 'application/json',
      accept: 'application/json',
      body: JSON.stringify(requestBody),
    });

    const response = await client.send(command);
    const responseBody = JSON.parse(new TextDecoder().decode(response.body));

    // Calculate approximate cost
    const inputTokens = responseBody.usage?.input_tokens || 0;
    const outputTokens = responseBody.usage?.output_tokens || 0;
    const cost = {
      input: inputTokens * COST_PER_INPUT_TOKEN,
      output: outputTokens * COST_PER_OUTPUT_TOKEN,
      total: (inputTokens * COST_PER_INPUT_TOKEN) + (outputTokens * COST_PER_OUTPUT_TOKEN),
    };

    return {
      content: responseBody.content[0].text,
      stopReason: responseBody.stop_reason,
      usage: {
        inputTokens,
        outputTokens,
      },
      cost,
    };
  } catch (error) {
    console.error('[Bedrock] Error invoking model:', error);
    throw new Error(`Failed to invoke Claude: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Invoke Claude model with streaming (for real-time UI updates)
 *
 * @param params - Request parameters
 * @param onChunk - Callback for each text chunk
 * @returns Final response with full content
 */
export async function invokeClaudeStream(
  params: BedrockInvokeParams,
  onChunk: (chunk: string) => void
): Promise<BedrockResponse> {
  const client = getBedrockClient();

  // Build request body (same as non-streaming)
  const requestBody = {
    anthropic_version: 'bedrock-2023-05-31',
    max_tokens: params.maxTokens || 4096,
    messages: params.messages,
    ...(params.systemPrompt && { system: params.systemPrompt }),
    ...(params.temperature !== undefined && { temperature: params.temperature }),
    ...(params.topP !== undefined && { top_p: params.topP }),
    ...(params.stopSequences && { stop_sequences: params.stopSequences }),
  };

  try {
    const command = new InvokeModelWithResponseStreamCommand({
      modelId: MODEL_ID,
      contentType: 'application/json',
      accept: 'application/json',
      body: JSON.stringify(requestBody),
    });

    const response = await client.send(command);

    let fullContent = '';
    let stopReason = '';
    let inputTokens = 0;
    let outputTokens = 0;

    if (response.body) {
      for await (const event of response.body) {
        if (event.chunk) {
          const chunk = JSON.parse(new TextDecoder().decode(event.chunk.bytes));

          // Handle different event types
          if (chunk.type === 'content_block_delta') {
            const text = chunk.delta?.text || '';
            fullContent += text;
            onChunk(text);
          } else if (chunk.type === 'message_delta') {
            stopReason = chunk.delta?.stop_reason || '';
          } else if (chunk.type === 'message_start') {
            inputTokens = chunk.message?.usage?.input_tokens || 0;
          } else if (chunk.type === 'message_delta') {
            outputTokens = chunk.usage?.output_tokens || 0;
          }
        }
      }
    }

    // Calculate cost
    const cost = {
      input: inputTokens * COST_PER_INPUT_TOKEN,
      output: outputTokens * COST_PER_OUTPUT_TOKEN,
      total: (inputTokens * COST_PER_INPUT_TOKEN) + (outputTokens * COST_PER_OUTPUT_TOKEN),
    };

    return {
      content: fullContent,
      stopReason,
      usage: {
        inputTokens,
        outputTokens,
      },
      cost,
    };
  } catch (error) {
    console.error('[Bedrock] Error streaming model:', error);
    throw new Error(`Failed to stream Claude: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Helper: Check if Bedrock is configured
 */
export function isBedrockConfigured(): boolean {
  // Check for AWS credentials (environment or IAM role)
  const hasCredentials = !!(
    process.env.AWS_ACCESS_KEY_ID ||
    process.env.AWS_CONTAINER_CREDENTIALS_RELATIVE_URI // ECS IAM role
  );

  return hasCredentials;
}

/**
 * Helper: Estimate cost for a request (before making it)
 *
 * @param estimatedInputTokens - Approximate input token count
 * @param estimatedOutputTokens - Approximate output token count
 * @param useCache - Whether prompt caching will be used
 * @returns Estimated cost in USD
 */
export function estimateCost(
  estimatedInputTokens: number,
  estimatedOutputTokens: number,
  useCache = false
): number {
  const inputCost = estimatedInputTokens * (useCache ? COST_WITH_CACHE : COST_PER_INPUT_TOKEN);
  const outputCost = estimatedOutputTokens * COST_PER_OUTPUT_TOKEN;
  return inputCost + outputCost;
}

/**
 * Helper: Log usage and cost for monitoring
 */
export function logUsage(
  operation: string,
  userId: string,
  response: BedrockResponse
): void {
  console.log('[Bedrock Usage]', {
    operation,
    userId,
    inputTokens: response.usage.inputTokens,
    outputTokens: response.usage.outputTokens,
    cost: response.cost?.total.toFixed(6),
    timestamp: new Date().toISOString(),
  });

  // TODO: Store usage in DynamoDB for analytics and billing
  // - Track per-user AI request counts
  // - Monitor cost per subscription tier
  // - Generate usage reports
}
