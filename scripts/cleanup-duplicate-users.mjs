#!/usr/bin/env node

import { DynamoDBClient, DeleteItemCommand, ScanCommand } from '@aws-sdk/client-dynamodb';

const client = new DynamoDBClient({ region: 'us-east-1' });

async function cleanupDuplicates(email, keepUserId) {
  console.log(`🔍 Finding all users with email: ${email}\n`);

  const scanCommand = new ScanCommand({
    TableName: 'spotter-users',
    FilterExpression: 'email = :email',
    ExpressionAttributeValues: {
      ':email': { S: email }
    }
  });

  const response = await client.send(scanCommand);

  if (!response.Items || response.Items.length === 0) {
    console.log('❌ No users found');
    return;
  }

  console.log(`Found ${response.Items.length} user(s)\n`);

  const usersToDelete = response.Items.filter(u => u.id?.S !== keepUserId);
  const keepUser = response.Items.find(u => u.id?.S === keepUserId);

  if (!keepUser) {
    console.log(`❌ User ID ${keepUserId} not found in results`);
    return;
  }

  console.log(`✅ KEEPING User ID: ${keepUser.id?.S}`);
  console.log(`   Stripe Customer: ${keepUser.stripeCustomerId?.S || 'none'}`);
  console.log(`   Tier: ${keepUser.subscriptionTier?.S || 'free'}`);
  console.log('');

  console.log(`🗑️  DELETING ${usersToDelete.length} duplicate user(s):\n`);

  for (const user of usersToDelete) {
    const userId = user.id?.S;
    const stripeCustomerId = user.stripeCustomerId?.S || 'none';

    console.log(`   Deleting: ${userId}`);
    console.log(`      Stripe Customer: ${stripeCustomerId}`);

    const deleteCommand = new DeleteItemCommand({
      TableName: 'spotter-users',
      Key: {
        id: { S: userId }
      }
    });

    await client.send(deleteCommand);
    console.log(`   ✅ Deleted\n`);
  }

  console.log(`\n✅ Cleanup complete! Kept 1 user, deleted ${usersToDelete.length} duplicates.`);
  console.log(`\n⚠️  IMPORTANT: Now sign out completely and sign back in.`);
  console.log(`   The auth system should now find the existing user instead of creating a new one.`);
}

const email = process.argv[2];
const keepUserId = process.argv[3];

if (!email || !keepUserId) {
  console.error('❌ Missing required arguments');
  console.error('Usage: node scripts/cleanup-duplicate-users.mjs <email> <user-id-to-keep>');
  console.error('');
  console.error('Example:');
  console.error('  node scripts/cleanup-duplicate-users.mjs alejo@cannashieldct.com cmigk5d3n0003lo018zvamhqh');
  process.exit(1);
}

cleanupDuplicates(email, keepUserId).catch(console.error);
