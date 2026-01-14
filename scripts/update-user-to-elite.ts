#!/usr/bin/env tsx
/**
 * Update user to elite tier and ensure it's synced with AWS DynamoDB
 * Usage: npx tsx scripts/update-user-to-elite.ts <email>
 */

import { dynamoDBUsers } from '../src/lib/dynamodb';

const EMAIL = process.argv[2];

if (!EMAIL) {
  console.error('❌ Error: Email address required');
  console.log('Usage: npx tsx scripts/update-user-to-elite.ts <email>');
  process.exit(1);
}

async function updateUserToElite() {
  try {
    console.log(`\n🔍 Looking up user: ${EMAIL}`);

    // Get user by email
    const user = await dynamoDBUsers.getByEmail(EMAIL);

    if (!user) {
      console.error(`❌ User not found: ${EMAIL}`);
      process.exit(1);
    }

    console.log(`\n✓ User found:`);
    console.log(`  ID: ${user.id}`);
    console.log(`  Email: ${user.email}`);
    console.log(`  Current Tier: ${user.subscriptionTier}`);
    console.log(`  Current Status: ${user.subscriptionStatus}`);

    // Update to elite tier
    console.log(`\n🔄 Updating user to Elite tier...`);

    await dynamoDBUsers.updateSubscription(user.id, {
      tier: 'elite',
      status: 'active',
      startDate: new Date(),
    });

    console.log(`✅ Updated subscription to Elite tier`);

    // Verify the update in DynamoDB
    console.log(`\n🔍 Verifying update in DynamoDB...`);
    const updatedUser = await dynamoDBUsers.get(user.id, true); // Use consistent read

    if (!updatedUser) {
      console.error(`❌ Failed to retrieve updated user from DynamoDB`);
      process.exit(1);
    }

    console.log(`\n✅ Verification successful:`);
    console.log(`  ID: ${updatedUser.id}`);
    console.log(`  Email: ${updatedUser.email}`);
    console.log(`  Subscription Tier: ${updatedUser.subscriptionTier}`);
    console.log(`  Subscription Status: ${updatedUser.subscriptionStatus}`);
    console.log(`  Start Date: ${updatedUser.subscriptionStartDate}`);
    console.log(`  Updated At: ${updatedUser.updatedAt}`);

    if (updatedUser.subscriptionTier !== 'elite') {
      console.error(`\n❌ ERROR: Tier mismatch! Expected 'elite', got '${updatedUser.subscriptionTier}'`);
      process.exit(1);
    }

    console.log(`\n✅ User ${EMAIL} successfully updated to Elite tier and verified in AWS DynamoDB`);

  } catch (error) {
    console.error('\n❌ Error updating user:', error);
    if (error instanceof Error) {
      console.error(`  Message: ${error.message}`);
      console.error(`  Stack: ${error.stack}`);
    }
    process.exit(1);
  }
}

updateUserToElite();
