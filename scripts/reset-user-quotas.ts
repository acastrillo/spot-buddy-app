/**
 * Reset User Quotas Script
 *
 * This script resets user quotas based on their subscription tier and reset periods.
 * Should be run as a cron job:
 *
 * - Weekly (Sunday midnight): Reset OCR quotas, Core tier Instagram imports
 * - Monthly (1st of month): Reset AI requests, Free tier Instagram imports
 *
 * Usage:
 *   npx tsx scripts/reset-user-quotas.ts [--type=ocr|ai|instagram|all] [--dry-run]
 *
 * Examples:
 *   npx tsx scripts/reset-user-quotas.ts --type=all
 *   npx tsx scripts/reset-user-quotas.ts --type=ocr --dry-run
 */

import { dynamoDBUsers } from '../src/lib/dynamodb';
import { DynamoDBClient, ScanCommand } from '@aws-sdk/client-dynamodb';
import { unmarshall } from '@aws-sdk/util-dynamodb';

const USERS_TABLE = process.env.DYNAMODB_USERS_TABLE || 'spotter-users';

interface ResetStats {
  total: number;
  success: number;
  failed: number;
  skipped: number;
}

async function getAllUsers() {
  const client = new DynamoDBClient({
    region: process.env.AWS_REGION || 'us-east-1',
    credentials: process.env.AWS_ACCESS_KEY_ID
      ? {
          accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
          sessionToken: process.env.AWS_SESSION_TOKEN,
        }
      : undefined,
  });

  const users: any[] = [];
  let lastEvaluatedKey: Record<string, any> | undefined;

  do {
    const command = new ScanCommand({
      TableName: USERS_TABLE,
      ExclusiveStartKey: lastEvaluatedKey,
    });

    const response = await client.send(command);
    if (response.Items) {
      users.push(...response.Items.map(item => unmarshall(item)));
    }
    lastEvaluatedKey = response.LastEvaluatedKey;
  } while (lastEvaluatedKey);

  return users;
}

function shouldResetOCR(user: any, now: Date): boolean {
  // OCR resets weekly (every Sunday at midnight)
  const resetDate = user.ocrQuotaResetDate ? new Date(user.ocrQuotaResetDate) : null;
  if (!resetDate) return true; // Never reset, do it now

  const daysSinceReset = (now.getTime() - resetDate.getTime()) / (1000 * 60 * 60 * 24);
  return daysSinceReset >= 7;
}

function shouldResetAI(user: any, now: Date): boolean {
  // AI resets monthly (1st of each month)
  const resetDate = user.lastAiRequestReset ? new Date(user.lastAiRequestReset) : null;
  if (!resetDate) return true; // Never reset, do it now

  // Check if we're in a different month than the last reset
  return resetDate.getMonth() !== now.getMonth() || resetDate.getFullYear() !== now.getFullYear();
}

function shouldResetInstagram(user: any, now: Date): boolean {
  // Instagram resets based on tier:
  // - Free: Monthly (1st of month)
  // - Core: Weekly (Sunday midnight)
  // - Pro/Elite: Unlimited (no reset needed)
  const tier = user.subscriptionTier || 'free';
  if (tier === 'pro' || tier === 'elite') return false; // Unlimited, no reset

  const resetDate = user.lastInstagramImportReset ? new Date(user.lastInstagramImportReset) : null;
  if (!resetDate) return true; // Never reset, do it now

  if (tier === 'free') {
    // Monthly reset
    return resetDate.getMonth() !== now.getMonth() || resetDate.getFullYear() !== now.getFullYear();
  } else {
    // Weekly reset (core tier)
    const daysSinceReset = (now.getTime() - resetDate.getTime()) / (1000 * 60 * 60 * 24);
    return daysSinceReset >= 7;
  }
}

async function resetQuotas(
  quotaType: 'ocr' | 'ai' | 'instagram' | 'all',
  dryRun: boolean = false
) {
  const stats: ResetStats = {
    total: 0,
    success: 0,
    failed: 0,
    skipped: 0,
  };

  console.log(`\n🔄 Starting quota reset process...`);
  console.log(`   Type: ${quotaType}`);
  console.log(`   Dry run: ${dryRun ? 'Yes (no changes will be made)' : 'No'}`);
  console.log(`   Time: ${new Date().toISOString()}\n`);

  try {
    // Get all users
    console.log('📊 Fetching all users from DynamoDB...');
    const users = await getAllUsers();
    stats.total = users.length;
    console.log(`✅ Found ${users.length} users\n`);

    const now = new Date();

    // Process each user
    for (const user of users) {
      const userEmail = user.email || user.id;
      const isAdmin = user.isAdmin === true;

      // Skip admins (they don't need quota resets)
      if (isAdmin) {
        console.log(`⏭️  Skipping admin user: ${userEmail}`);
        stats.skipped++;
        continue;
      }

      let resetCount = 0;
      const resetTypes: string[] = [];

      try {
        // OCR Quota Reset
        if ((quotaType === 'ocr' || quotaType === 'all') && shouldResetOCR(user, now)) {
          resetTypes.push('OCR');
          if (!dryRun) {
            await dynamoDBUsers.resetCounter(user.id, 'ocrQuotaUsed', 'ocrQuotaResetDate');
          }
          resetCount++;
        }

        // AI Quota Reset
        if ((quotaType === 'ai' || quotaType === 'all') && shouldResetAI(user, now)) {
          resetTypes.push('AI');
          if (!dryRun) {
            await dynamoDBUsers.resetAIQuota(user.id);
          }
          resetCount++;
        }

        // Instagram Quota Reset
        if ((quotaType === 'instagram' || quotaType === 'all') && shouldResetInstagram(user, now)) {
          resetTypes.push('Instagram');
          if (!dryRun) {
            await dynamoDBUsers.resetInstagramQuota(user.id);
          }
          resetCount++;
        }

        if (resetCount > 0) {
          console.log(`✅ ${userEmail} (${user.subscriptionTier}): Reset ${resetTypes.join(', ')}`);
          stats.success++;
        } else {
          stats.skipped++;
        }

      } catch (error) {
        console.error(`❌ Failed to reset quotas for ${userEmail}:`, error);
        stats.failed++;
      }
    }

    // Summary
    console.log(`\n📊 Reset Summary:`);
    console.log(`   Total users: ${stats.total}`);
    console.log(`   ✅ Successfully reset: ${stats.success}`);
    console.log(`   ⏭️  Skipped (no reset needed): ${stats.skipped}`);
    console.log(`   ❌ Failed: ${stats.failed}`);

    if (dryRun) {
      console.log(`\n⚠️  DRY RUN MODE - No actual changes were made`);
      console.log(`   Run without --dry-run to apply changes`);
    }

  } catch (error) {
    console.error('❌ Fatal error during quota reset:', error);
    process.exit(1);
  }
}

// Parse command line arguments
const args = process.argv.slice(2);
let quotaType: 'ocr' | 'ai' | 'instagram' | 'all' = 'all';
let dryRun = false;

for (const arg of args) {
  if (arg.startsWith('--type=')) {
    const type = arg.split('=')[1] as any;
    if (['ocr', 'ai', 'instagram', 'all'].includes(type)) {
      quotaType = type;
    } else {
      console.error('❌ Invalid quota type. Must be: ocr, ai, instagram, or all');
      process.exit(1);
    }
  } else if (arg === '--dry-run') {
    dryRun = true;
  } else if (arg === '--help' || arg === '-h') {
    console.log(`
Reset User Quotas Script

Usage: npx tsx scripts/reset-user-quotas.ts [options]

Options:
  --type=TYPE    Quota type to reset (ocr|ai|instagram|all) [default: all]
  --dry-run      Preview changes without applying them
  --help, -h     Show this help message

Examples:
  npx tsx scripts/reset-user-quotas.ts --type=all
  npx tsx scripts/reset-user-quotas.ts --type=ocr --dry-run
  npx tsx scripts/reset-user-quotas.ts --type=ai

Quota Reset Schedules:
  - OCR: Weekly (every 7 days)
  - AI: Monthly (1st of each month)
  - Instagram:
    * Free tier: Monthly
    * Core tier: Weekly
    * Pro/Elite: Unlimited (no reset)
`);
    process.exit(0);
  }
}

// Run the reset
resetQuotas(quotaType, dryRun);
