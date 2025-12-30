#!/usr/bin/env node
/**
 * Test script to invoke Bedrock Claude model
 * This will attempt to invoke the model and see what specific error we get
 */

import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';

const REGION = process.env.AWS_BEDROCK_REGION || 'us-east-1';

// Try the inference profile model ID (what the app uses)
const MODEL_ID = 'us.anthropic.claude-sonnet-4-5-20250929-v1:0';

console.log('🧪 Testing Bedrock Model Invocation');
console.log('=====================================');
console.log(`Region: ${REGION}`);
console.log(`Model: ${MODEL_ID}`);
console.log('');

const client = new BedrockRuntimeClient({ region: REGION });

const payload = {
  anthropic_version: 'bedrock-2023-05-31',
  max_tokens: 100,
  messages: [
    {
      role: 'user',
      content: 'Say "test successful" if you can read this.',
    },
  ],
};

const command = new InvokeModelCommand({
  modelId: MODEL_ID,
  contentType: 'application/json',
  accept: 'application/json',
  body: JSON.stringify(payload),
});

try {
  console.log('📤 Sending test request to Bedrock...');
  const response = await client.send(command);

  const responseBody = JSON.parse(new TextDecoder().decode(response.body));

  console.log('✅ SUCCESS! Model invoked successfully');
  console.log('');
  console.log('Response:');
  console.log(JSON.stringify(responseBody, null, 2));
  console.log('');
  console.log('🎉 The AI enhancement feature should now work!');
  process.exit(0);
} catch (error) {
  console.log('❌ ERROR invoking model:');
  console.log('');
  console.log(`Error Type: ${error.name}`);
  console.log(`Error Message: ${error.message}`);
  console.log('');

  if (error.message.includes('AWS Marketplace')) {
    console.log('📋 DIAGNOSIS:');
    console.log('The error is still about AWS Marketplace permissions/subscription.');
    console.log('');
    console.log('🔧 SOLUTION:');
    console.log('You need to enable model access in the Bedrock console:');
    console.log('1. Go to: https://console.aws.amazon.com/bedrock/home?region=us-east-1#/modelaccess');
    console.log('2. Click "Manage model access"');
    console.log('3. Enable Claude 4.5 models (Haiku, Sonnet, Opus)');
    console.log('4. Fill out the Anthropic use case form');
    console.log('5. Submit and wait 1-2 minutes');
    console.log('');
    console.log('📚 See docs/BEDROCK-MODEL-ACCESS-SETUP.md for detailed instructions');
  } else if (error.message.includes('AccessDeniedException')) {
    console.log('📋 DIAGNOSIS:');
    console.log('IAM permissions issue - the role lacks necessary Bedrock permissions');
    console.log('');
    console.log('🔧 SOLUTION:');
    console.log('Verify SpotterTaskRole has bedrock:InvokeModel permissions');
  } else {
    console.log('📋 Full Error Details:');
    console.log(JSON.stringify(error, null, 2));
  }

  process.exit(1);
}
