/**
 * AWS Bedrock Client for AI-Powered Features
 *
 * This module provides a centralized client for interacting with Amazon Bedrock
 * using Claude models for workout enhancements, generation, and AI features.
 *
 * Features:
 * - Smart Workout Parser (enhance messy OCR text)
 * - AI Workout Generator (natural language  full workout)
 * - Training insights and recommendations
 *
 * Cost optimization:
 * - Prompt caching on reusable prompt blocks
 * - Batch helpers for high-volume processing
 * - Streaming responses for better UX
 *
 * Model Updates:
 * - Claude Sonnet 4.5 (balanced quality and cost)
 * - Claude Haiku 4.5 (fast, cost-efficient)
 * - Claude Opus 4.5 (highest accuracy, premium)
 */

import {
  BedrockRuntimeClient,
  InvokeModelCommand,
  InvokeModelWithResponseStreamCommand,
} from '@aws-sdk/client-bedrock-runtime';

// Bedrock configuration
const BEDROCK_REGION = process.env.AWS_BEDROCK_REGION || process.env.AWS_REGION || 'us-east-1';
// Use cross-region inference profiles for Claude models
// Cross-region inference profiles are required for on-demand throughput
// This provides automatic routing to the best available region for optimal performance
export type ClaudeModel = 'opus' | 'sonnet' | 'haiku';

const MODEL_IDS: Record<ClaudeModel, string> = {
  opus: process.env.AWS_BEDROCK_MODEL_OPUS || 'us.anthropic.claude-opus-4-5-20251101-v1:0',
  sonnet: process.env.AWS_BEDROCK_MODEL_SONNET || 'us.anthropic.claude-sonnet-4-5-20250929-v1:0',
  haiku: process.env.AWS_BEDROCK_MODEL_HAIKU || 'us.anthropic.claude-haiku-4-5-20251001-v1:0',
};
const DEFAULT_MODEL: ClaudeModel = 'sonnet';

// Update these defaults to match current Bedrock pricing for your enabled models.
const MODEL_PRICING_DEFAULT: Record<ClaudeModel, { input: number; output: number }> = {
  opus: { input: 0.000015, output: 0.000075 }, // $15 / $75 per 1M tokens
  sonnet: { input: 0.000003, output: 0.000015 }, // $3 / $15 per 1M tokens
  haiku: { input: 0.00000025, output: 0.00000125 }, // $0.25 / $1.25 per 1M tokens
};
const CACHE_READ_DISCOUNT = 0.1; // Cached reads billed at 10% of input price

function resolveModelPricing(model: ClaudeModel): { input: number; output: number } {
  const defaultPricing = MODEL_PRICING_DEFAULT[model];
  const prefix = model.toUpperCase();
  const inputOverride = process.env[`AWS_BEDROCK_PRICE_${prefix}_INPUT`];
  const outputOverride = process.env[`AWS_BEDROCK_PRICE_${prefix}_OUTPUT`];

  const input = inputOverride ? Number(inputOverride) : defaultPricing.input;
  const output = outputOverride ? Number(outputOverride) : defaultPricing.output;

  return {
    input: Number.isFinite(input) ? input : defaultPricing.input,
    output: Number.isFinite(output) ? output : defaultPricing.output,
  };
}

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

export interface CacheControl {
  type: 'ephemeral';
}

export interface ClaudeContentBlock {
  type: 'text';
  text: string;
  cache_control?: CacheControl;
}

export type ClaudeContent = string | ClaudeContentBlock[];

/**
 * Message structure for Claude
 */
export interface ClaudeMessage {
  role: 'user' | 'assistant';
  content: ClaudeContent;
}

export interface PromptCacheConfig {
  system?: boolean;
  messages?: number[]; // Indexes of messages to cache
}

/**
 * Request parameters for Bedrock invoke
 */
export interface BedrockInvokeParams {
  messages: ClaudeMessage[];
  systemPrompt?: ClaudeContent;
  maxTokens?: number;
  temperature?: number;
  topP?: number;
  stopSequences?: string[];
  model?: ClaudeModel; // Model selection for cost/performance tradeoff
  cache?: PromptCacheConfig;
  latencyOptimized?: boolean; // Enable latency-optimized inference (42-77% faster)
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
    cacheCreationInputTokens?: number;
    cacheReadInputTokens?: number;
  };
  cost?: {
    input: number;
    output: number;
    total: number;
  };
}

export function getModelId(model: ClaudeModel = DEFAULT_MODEL): string {
  return MODEL_IDS[model];
}

function applyCacheControlToContent(content: ClaudeContent, cache: boolean): ClaudeContent {
  if (!cache) return content;

  if (typeof content === 'string') {
    return [
      {
        type: 'text',
        text: content,
        cache_control: { type: 'ephemeral' },
      },
    ];
  }

  if (content.length === 0 || content.some((block) => block.cache_control)) {
    return content;
  }

  const lastIndex = content.length - 1;
  return content.map((block, index) =>
    index === lastIndex ? { ...block, cache_control: { type: 'ephemeral' } } : block
  );
}

function normalizeMessages(
  messages: ClaudeMessage[],
  cacheConfig?: PromptCacheConfig
): ClaudeMessage[] {
  const cachedMessages = new Set(cacheConfig?.messages ?? []);

  return messages.map((message, index) => ({
    ...message,
    content: applyCacheControlToContent(message.content, cachedMessages.has(index)),
  }));
}

function normalizeSystemPrompt(
  systemPrompt: ClaudeContent | undefined,
  cacheConfig?: PromptCacheConfig
): ClaudeContent | undefined {
  if (!systemPrompt) return undefined;
  return applyCacheControlToContent(systemPrompt, !!cacheConfig?.system);
}

function buildRequestBody(params: BedrockInvokeParams): {
  modelId: string;
  requestBody: Record<string, unknown>;
  model: ClaudeModel;
} {
  const modelKey = params.model || DEFAULT_MODEL;
  const modelId = MODEL_IDS[modelKey];

  const requestBody: Record<string, unknown> = {
    anthropic_version: 'bedrock-2023-05-31',
    max_tokens: params.maxTokens || 4096,
    messages: normalizeMessages(params.messages, params.cache),
    ...(params.temperature !== undefined && { temperature: params.temperature }),
    ...(params.topP !== undefined && { top_p: params.topP }),
    ...(params.stopSequences && { stop_sequences: params.stopSequences }),
  };

  const systemPrompt = normalizeSystemPrompt(params.systemPrompt, params.cache);
  if (systemPrompt) {
    requestBody.system = systemPrompt;
  }

  return { modelId, requestBody, model: modelKey };
}

function extractTextContent(content: any): string {
  if (typeof content === 'string') return content;
  if (!Array.isArray(content)) return '';
  return content.map((block) => (typeof block?.text === 'string' ? block.text : '')).join('');
}

function buildUsage(usage: any): BedrockResponse['usage'] {
  const cacheCreationInputTokens = usage?.cache_creation_input_tokens ?? 0;
  const cacheReadInputTokens = usage?.cache_read_input_tokens ?? 0;
  const inputTokens = usage?.input_tokens ?? (cacheCreationInputTokens + cacheReadInputTokens);
  const outputTokens = usage?.output_tokens ?? 0;

  return {
    inputTokens,
    outputTokens,
    ...(cacheCreationInputTokens ? { cacheCreationInputTokens } : {}),
    ...(cacheReadInputTokens ? { cacheReadInputTokens } : {}),
  };
}

function calculateCost(usage: BedrockResponse['usage'], model: ClaudeModel): BedrockResponse['cost'] {
  const pricing = resolveModelPricing(model);
  const hasCacheUsage = !!(usage.cacheCreationInputTokens || usage.cacheReadInputTokens);

  const inputCost = hasCacheUsage
    ? (usage.cacheCreationInputTokens || 0) * pricing.input +
      (usage.cacheReadInputTokens || 0) * pricing.input * CACHE_READ_DISCOUNT
    : usage.inputTokens * pricing.input;
  const outputCost = usage.outputTokens * pricing.output;

  return {
    input: inputCost,
    output: outputCost,
    total: inputCost + outputCost,
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
  const { modelId, requestBody, model } = buildRequestBody(params);

  try {
    const commandParams: any = {
      modelId,
      contentType: 'application/json',
      accept: 'application/json',
      body: JSON.stringify(requestBody),
    };

    // Add latency optimization if requested (42-77% faster responses)
    if (params.latencyOptimized) {
      commandParams.performanceConfig = {
        latency: 'optimized',
      };
    }

    const command = new InvokeModelCommand(commandParams);

    const response = await client.send(command);
    const responseBody = JSON.parse(new TextDecoder().decode(response.body));

    const usage = buildUsage(responseBody.usage);
    const cost = calculateCost(usage, model);

    return {
      content: extractTextContent(responseBody.content),
      stopReason: responseBody.stop_reason,
      usage,
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
  const { modelId, requestBody, model } = buildRequestBody(params);

  try {
    const commandParams: any = {
      modelId,
      contentType: 'application/json',
      accept: 'application/json',
      body: JSON.stringify(requestBody),
    };

    // Add latency optimization if requested (42-77% faster responses)
    if (params.latencyOptimized) {
      commandParams.performanceConfig = {
        latency: 'optimized',
      };
    }

    const command = new InvokeModelWithResponseStreamCommand(commandParams);

    const response = await client.send(command);

    let fullContent = '';
    let stopReason = '';
    let inputTokens = 0;
    let outputTokens = 0;
    let cacheCreationInputTokens = 0;
    let cacheReadInputTokens = 0;

    if (response.body) {
      for await (const event of response.body) {
        if (event.chunk) {
          const chunk = JSON.parse(new TextDecoder().decode(event.chunk.bytes));

          // Handle different event types
          if (chunk.type === 'content_block_delta') {
            const text = chunk.delta?.text || '';
            fullContent += text;
            onChunk(text);
          } else if (chunk.type === 'message_start') {
            inputTokens = chunk.message?.usage?.input_tokens || 0;
            cacheCreationInputTokens = chunk.message?.usage?.cache_creation_input_tokens || 0;
            cacheReadInputTokens = chunk.message?.usage?.cache_read_input_tokens || 0;
          } else if (chunk.type === 'message_delta') {
            if (chunk.delta?.stop_reason) {
              stopReason = chunk.delta.stop_reason;
            }
            if (chunk.usage?.output_tokens !== undefined) {
              outputTokens = chunk.usage.output_tokens;
            }
            if (chunk.usage?.cache_creation_input_tokens !== undefined) {
              cacheCreationInputTokens = chunk.usage.cache_creation_input_tokens;
            }
            if (chunk.usage?.cache_read_input_tokens !== undefined) {
              cacheReadInputTokens = chunk.usage.cache_read_input_tokens;
            }
          }
        }
      }
    }

    const usage: BedrockResponse['usage'] = {
      inputTokens: inputTokens || (cacheCreationInputTokens + cacheReadInputTokens),
      outputTokens,
      ...(cacheCreationInputTokens ? { cacheCreationInputTokens } : {}),
      ...(cacheReadInputTokens ? { cacheReadInputTokens } : {}),
    };
    const cost = calculateCost(usage, model);

    return {
      content: fullContent,
      stopReason,
      usage,
      cost,
    };
  } catch (error) {
    console.error('[Bedrock] Error streaming model:', error);
    throw new Error(`Failed to stream Claude: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export interface BatchInvokeOptions {
  concurrency?: number;
}

/**
 * Invoke Claude for a batch of requests with a simple concurrency limit.
 */
export async function invokeClaudeBatch(
  requests: BedrockInvokeParams[],
  options: BatchInvokeOptions = {}
): Promise<BedrockResponse[]> {
  if (requests.length === 0) return [];

  const concurrency = Math.max(1, Math.floor(options.concurrency ?? 3));
  const results: BedrockResponse[] = new Array(requests.length);
  let index = 0;

  const worker = async () => {
    while (true) {
      const currentIndex = index++;
      if (currentIndex >= requests.length) break;
      results[currentIndex] = await invokeClaude(requests[currentIndex]);
    }
  };

  const workers = Array.from(
    { length: Math.min(concurrency, requests.length) },
    () => worker()
  );

  await Promise.all(workers);
  return results;
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
 * @param options - Model and cached input token estimates
 * @returns Estimated cost in USD
 */
export function estimateCost(
  estimatedInputTokens: number,
  estimatedOutputTokens: number,
  options: { model?: ClaudeModel; cachedInputTokens?: number } = {}
): number {
  const model = options.model || DEFAULT_MODEL;
  const pricing = resolveModelPricing(model);
  const cachedInputTokens = options.cachedInputTokens || 0;
  const uncachedInputTokens = Math.max(estimatedInputTokens - cachedInputTokens, 0);
  const inputCost = (uncachedInputTokens * pricing.input) +
    (cachedInputTokens * pricing.input * CACHE_READ_DISCOUNT);
  const outputCost = estimatedOutputTokens * pricing.output;
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
    cacheCreationInputTokens: response.usage.cacheCreationInputTokens,
    cacheReadInputTokens: response.usage.cacheReadInputTokens,
    cost: response.cost?.total.toFixed(6),
    timestamp: new Date().toISOString(),
  });

  // TODO: Store usage in DynamoDB for analytics and billing
  // - Track per-user AI request counts
  // - Monitor cost per subscription tier
  // - Generate usage reports
}

/**
 * Simple health check to verify Bedrock credentials and model access.
 * Keeps the prompt tiny so it costs only a few tokens.
 */
export async function testBedrockConnection(): Promise<boolean> {
  try {
    const response = await invokeClaude({
      messages: [
        {
          role: 'user',
          content: 'Reply with the word OK to confirm connectivity.',
        },
      ],
      systemPrompt: 'You are a health check. Output exactly "OK".',
      maxTokens: 2,
      temperature: 0,
    });

    return response.content.trim().toUpperCase().startsWith('OK');
  } catch (error) {
    console.error('[Bedrock] Connection test failed:', error);
    return false;
  }
}
