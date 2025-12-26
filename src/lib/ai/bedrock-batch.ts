import {
  BedrockClient,
  CreateModelInvocationJobCommand,
  GetModelInvocationJobCommand,
  ListModelInvocationJobsCommand,
  StopModelInvocationJobCommand,
  type Tag,
  type ListModelInvocationJobsRequest,
} from '@aws-sdk/client-bedrock';
import { getModelId, type ClaudeModel } from './bedrock-client';

const BEDROCK_REGION = process.env.AWS_BEDROCK_REGION || process.env.AWS_REGION || 'us-east-1';

let bedrockControlClient: BedrockClient | null = null;

export function getBedrockControlClient(): BedrockClient {
  if (!bedrockControlClient) {
    bedrockControlClient = new BedrockClient({ region: BEDROCK_REGION });
  }
  return bedrockControlClient;
}

export interface BatchJobRequest {
  inputS3Uri: string;
  outputS3Uri: string;
  roleArn: string;
  modelId?: string;
  model?: ClaudeModel;
  jobName?: string;
  clientRequestToken?: string;
  timeoutDurationInHours?: number;
  tags?: Record<string, string>;
  s3InputBucketOwner?: string;
  s3OutputBucketOwner?: string;
  s3OutputEncryptionKeyId?: string;
}

function toTags(tags: Record<string, string> | undefined): Tag[] | undefined {
  if (!tags) return undefined;
  return Object.entries(tags).map(([key, value]) => ({ key, value }));
}

export async function createBatchInvocationJob(request: BatchJobRequest): Promise<string> {
  const client = getBedrockControlClient();
  const modelId = request.modelId || getModelId(request.model);
  const jobName = request.jobName || `spotter-batch-${Date.now()}`;

  const command = new CreateModelInvocationJobCommand({
    jobName,
    roleArn: request.roleArn,
    clientRequestToken: request.clientRequestToken,
    modelId,
    inputDataConfig: {
      s3InputDataConfig: {
        s3Uri: request.inputS3Uri,
        s3BucketOwner: request.s3InputBucketOwner,
      },
    },
    outputDataConfig: {
      s3OutputDataConfig: {
        s3Uri: request.outputS3Uri,
        s3BucketOwner: request.s3OutputBucketOwner,
        s3EncryptionKeyId: request.s3OutputEncryptionKeyId,
      },
    },
    timeoutDurationInHours: request.timeoutDurationInHours,
    tags: toTags(request.tags),
  });

  const response = await client.send(command);
  if (!response.jobArn) {
    throw new Error('Bedrock batch job did not return a job ARN.');
  }
  return response.jobArn;
}

export async function getBatchInvocationJob(jobArn: string) {
  const client = getBedrockControlClient();
  const command = new GetModelInvocationJobCommand({ jobIdentifier: jobArn });
  return client.send(command);
}

export async function listBatchInvocationJobs(params: ListModelInvocationJobsRequest = {}) {
  const client = getBedrockControlClient();
  const command = new ListModelInvocationJobsCommand(params);
  return client.send(command);
}

export async function stopBatchInvocationJob(jobArn: string) {
  const client = getBedrockControlClient();
  const command = new StopModelInvocationJobCommand({ jobIdentifier: jobArn });
  return client.send(command);
}
