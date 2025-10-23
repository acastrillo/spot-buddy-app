/**
 * Amazon Bedrock Client for Claude Sonnet 4.5
 *
 * This client handles all communication with AWS Bedrock for AI-powered features:
 * - Workout enhancement (cleaning up OCR text, adding form cues)
 * - Workout generation (creating custom workouts from prompts)
 * - Workout of the Day generation
 */

import {
  BedrockRuntimeClient,
  InvokeModelCommand,
  InvokeModelCommandInput,
} from '@aws-sdk/client-bedrock-runtime';

// Model configuration
// Using inference profile for global availability and better routing
const MODEL_ID = 'us.anthropic.claude-3-5-sonnet-20241022-v2:0'; // Claude 3.5 Sonnet v2 inference profile
const MAX_TOKENS = 4096; // Maximum tokens for response
const TEMPERATURE = 0.7; // Balance between creativity and consistency

// Initialize Bedrock client lazily to avoid blocking during module initialization
let bedrockClient: BedrockRuntimeClient | null = null;

function getBedrockClient(): BedrockRuntimeClient {
  if (!bedrockClient) {
    // Create client config
    const config: any = {
      region: process.env.AWS_BEDROCK_REGION || process.env.AWS_REGION || 'us-east-1',
    };

    // Only add explicit credentials if they're provided in environment
    // Otherwise, the SDK will use the default credential chain (AWS CLI, etc.)
    if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) {
      config.credentials = {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
        sessionToken: process.env.AWS_SESSION_TOKEN,
      };
    }

    bedrockClient = new BedrockRuntimeClient(config);
  }
  return bedrockClient;
}

/**
 * Message structure for Claude API
 */
interface Message {
  role: 'user' | 'assistant';
  content: string;
}

/**
 * Options for invoking Claude
 */
interface InvokeOptions {
  systemPrompt?: string;
  temperature?: number;
  maxTokens?: number;
}

/**
 * Response from Claude
 */
interface ClaudeResponse {
  content: string;
  stopReason: string;
  usage: {
    inputTokens: number;
    outputTokens: number;
  };
}

/**
 * Invoke Claude Sonnet 4.5 via Bedrock
 */
export async function invokeClaude(
  messages: Message[],
  options: InvokeOptions = {}
): Promise<ClaudeResponse> {
  const {
    systemPrompt,
    temperature = TEMPERATURE,
    maxTokens = MAX_TOKENS,
  } = options;

  // Prepare request payload for Claude
  const payload = {
    anthropic_version: 'bedrock-2023-05-31',
    max_tokens: maxTokens,
    temperature,
    messages,
    ...(systemPrompt && { system: systemPrompt }),
  };

  const input: InvokeModelCommandInput = {
    modelId: MODEL_ID,
    contentType: 'application/json',
    accept: 'application/json',
    body: JSON.stringify(payload),
  };

  try {
    const command = new InvokeModelCommand(input);
    const response = await getBedrockClient().send(command);

    // Parse response
    const responseBody = JSON.parse(new TextDecoder().decode(response.body));

    return {
      content: responseBody.content[0].text,
      stopReason: responseBody.stop_reason,
      usage: {
        inputTokens: responseBody.usage.input_tokens,
        outputTokens: responseBody.usage.output_tokens,
      },
    };
  } catch (error) {
    console.error('Error invoking Claude via Bedrock:', error);
    throw new Error(
      `Failed to invoke Claude: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Simple text completion (single user message)
 */
export async function completeText(
  prompt: string,
  systemPrompt?: string,
  options: Omit<InvokeOptions, 'systemPrompt'> = {}
): Promise<string> {
  const messages: Message[] = [
    {
      role: 'user',
      content: prompt,
    },
  ];

  const response = await invokeClaude(messages, {
    ...options,
    systemPrompt,
  });

  return response.content;
}

/**
 * Calculate estimated cost for a request
 * Claude Sonnet 4.5 pricing: $3/MTok input, $15/MTok output
 */
export function estimateCost(inputTokens: number, outputTokens: number): number {
  const inputCost = (inputTokens / 1_000_000) * 3.0;
  const outputCost = (outputTokens / 1_000_000) * 15.0;
  return inputCost + outputCost;
}

/**
 * Health check - test Bedrock connection
 */
export async function testBedrockConnection(): Promise<boolean> {
  try {
    const response = await completeText(
      'Respond with only the word "OK" if you can read this message.',
      'You are a health check assistant. Respond only with "OK".',
      { maxTokens: 10 }
    );

    return response.trim().toUpperCase() === 'OK';
  } catch (error) {
    console.error('Bedrock connection test failed:', error);
    return false;
  }
}
