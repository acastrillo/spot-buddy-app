/**
 * Update IAM Policy to Include Workout Completions Table
 *
 * This script updates the SpotterTaskRole IAM policy to grant access
 * to the new spotter-workout-completions table.
 *
 * Usage: node scripts/update-iam-for-completions.mjs
 */

import { execSync } from "node:child_process";
import { IAMClient, PutRolePolicyCommand } from "@aws-sdk/client-iam";

const client = new IAMClient({ region: process.env.AWS_REGION || "us-east-1" });

const ROLE_NAME = "SpotterTaskRole";
const POLICY_NAME = "BedrockAndDynamoDBAccess";
const REGION = process.env.AWS_REGION || "us-east-1";

function resolveAccountId() {
  const envAccountId = process.env.AWS_ACCOUNT_ID || process.env.AWS_ACCOUNT;
  if (envAccountId) return envAccountId;

  try {
    return execSync("aws sts get-caller-identity --query Account --output text", {
      stdio: ["ignore", "pipe", "ignore"],
    })
      .toString()
      .trim();
  } catch {
    return null;
  }
}

const AWS_ACCOUNT_ID = resolveAccountId();
if (!AWS_ACCOUNT_ID) {
  console.error("AWS account ID not found. Set AWS_ACCOUNT_ID or configure AWS CLI.");
  process.exit(1);
}

async function updateIAMPolicy() {
  console.log(`\n🔐 Updating IAM policy for workout completions table access`);
  console.log(`   Role: ${ROLE_NAME}`);
  console.log(`   Policy: ${POLICY_NAME}\n`);

  try {
    // Updated policy with the new completions table
    const policyDocument = {
      Version: "2012-10-17",
      Statement: [
        {
          Effect: "Allow",
          Action: [
            "bedrock:InvokeModel",
            "bedrock:InvokeModelWithResponseStream"
          ],
          Resource: [
            "arn:aws:bedrock:*::foundation-model/anthropic.claude-*",
            `arn:aws:bedrock:*:${AWS_ACCOUNT_ID}:inference-profile/*`
          ]
        },
        {
          Effect: "Allow",
          Action: [
            "bedrock:CreateModelInvocationJob",
            "bedrock:GetModelInvocationJob",
            "bedrock:ListModelInvocationJobs",
            "bedrock:StopModelInvocationJob"
          ],
          Resource: "*"
        },
        {
          Effect: "Allow",
          Action: [
            "s3:ListBucket"
          ],
          Resource: [
            "arn:aws:s3:::spotter-ai-prompt-cache"
          ]
        },
        {
          Effect: "Allow",
          Action: [
            "s3:GetObject",
            "s3:PutObject",
            "s3:DeleteObject"
          ],
          Resource: [
            "arn:aws:s3:::spotter-ai-prompt-cache/*"
          ]
        },
        {
          Effect: "Allow",
          Action: [
            "dynamodb:GetItem",
            "dynamodb:PutItem",
            "dynamodb:UpdateItem",
            "dynamodb:DeleteItem",
            "dynamodb:Query",
            "dynamodb:Scan"
          ],
          Resource: [
            `arn:aws:dynamodb:${REGION}:${AWS_ACCOUNT_ID}:table/spotter-workouts`,
            `arn:aws:dynamodb:${REGION}:${AWS_ACCOUNT_ID}:table/spotter-users`,
            `arn:aws:dynamodb:${REGION}:${AWS_ACCOUNT_ID}:table/spotter-body-metrics`,
            `arn:aws:dynamodb:${REGION}:${AWS_ACCOUNT_ID}:table/spotter-workout-completions` // NEW TABLE
          ]
        }
      ]
    };

    const command = new PutRolePolicyCommand({
      RoleName: ROLE_NAME,
      PolicyName: POLICY_NAME,
      PolicyDocument: JSON.stringify(policyDocument, null, 2),
    });

    console.log("Updating IAM policy...");
    await client.send(command);

    console.log("\n✅ IAM policy updated successfully!");
    console.log("\n📋 Updated DynamoDB table access:");
    console.log("   ✓ spotter-workouts");
    console.log("   ✓ spotter-users");
    console.log("   ✓ spotter-body-metrics");
    console.log("   ✓ spotter-workout-completions (NEW)");

    console.log("\n🎯 Permissions granted:");
    console.log("   - GetItem");
    console.log("   - PutItem");
    console.log("   - UpdateItem");
    console.log("   - DeleteItem");
    console.log("   - Query");
    console.log("   - Scan");

    console.log("\n✨ The ECS tasks can now access the completions table!");
    console.log("   Note: Changes take effect immediately for new tasks.");

  } catch (error) {
    console.error("\n❌ Error updating IAM policy:");
    console.error(error);
    process.exit(1);
  }
}

// Run the script
updateIAMPolicy();
