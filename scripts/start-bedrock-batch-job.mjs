/**
 * Start a Bedrock batch inference job (S3 input/output).
 *
 * Usage:
 *  node scripts/start-bedrock-batch-job.mjs \
 *    --role-arn arn:aws:iam::123456789012:role/BedrockBatchRole \
 *    --input s3://spotter-ai-prompt-cache/batch/input.jsonl \
 *    --output s3://spotter-ai-prompt-cache/batch/output/ \
 *    --model-id us.anthropic.claude-sonnet-4-5-20250929-v1:0
 */

import { BedrockClient, CreateModelInvocationJobCommand } from '@aws-sdk/client-bedrock';

const region = process.env.AWS_BEDROCK_REGION || process.env.AWS_REGION || 'us-east-1';
const defaultBucket = process.env.BEDROCK_BATCH_BUCKET || 'spotter-ai-prompt-cache';

function getArg(name) {
  const index = process.argv.indexOf(`--${name}`);
  if (index === -1) return undefined;
  return process.argv[index + 1];
}

function requiredArg(name) {
  const value = getArg(name);
  if (!value) {
    console.error(`Missing required argument: --${name}`);
    process.exit(1);
  }
  return value;
}

const roleArn = requiredArg('role-arn');
const inputS3Uri = getArg('input') || `s3://${defaultBucket}/batch/input.jsonl`;
const outputS3Uri = getArg('output') || `s3://${defaultBucket}/batch/output/`;
const modelId =
  getArg('model-id') ||
  process.env.AWS_BEDROCK_MODEL_SONNET ||
  'us.anthropic.claude-sonnet-4-5-20250929-v1:0';
const jobName = getArg('job-name') || `spotter-batch-${Date.now()}`;

const client = new BedrockClient({ region });

const command = new CreateModelInvocationJobCommand({
  jobName,
  roleArn,
  modelId,
  inputDataConfig: {
    s3InputDataConfig: {
      s3Uri: inputS3Uri,
    },
  },
  outputDataConfig: {
    s3OutputDataConfig: {
      s3Uri: outputS3Uri,
    },
  },
});

console.log('Starting Bedrock batch job...');
console.log(`  jobName: ${jobName}`);
console.log(`  modelId: ${modelId}`);
console.log(`  input:   ${inputS3Uri}`);
console.log(`  output:  ${outputS3Uri}`);

const response = await client.send(command);

if (!response.jobArn) {
  console.error('No job ARN returned.');
  process.exit(1);
}

console.log(`Job ARN: ${response.jobArn}`);
