#!/usr/bin/env node

/**
 * Quick User Status Checker
 *
 * Usage: node scripts/check-user-status.mjs <email>
 * Example: node scripts/check-user-status.mjs alejo@cannashieldct.com
 */

import { DynamoDBClient, ScanCommand, GetItemCommand } from '@aws-sdk/client-dynamodb';

const client = new DynamoDBClient({ region: 'us-east-1' });

async function findUserByEmail(email) {
  console.log(`🔍 Looking for user with email: ${email}\n`);

  const command = new ScanCommand({
    TableName: 'spotter-users',
    FilterExpression: 'email = :email',
    ExpressionAttributeValues: {
      ':email': { S: email }
    }
  });

  const response = await client.send(command);

  if (!response.Items || response.Items.length === 0) {
    console.log('❌ No user found with that email');
    return;
  }

  const user = response.Items[0];
  console.log('✅ User found:');
  console.log('─'.repeat(60));
  console.log('   User ID:', user.id?.S || 'N/A');
  console.log('   Email:', user.email?.S || 'N/A');
  console.log('   Name:', user.name?.S || 'N/A');
  console.log('─'.repeat(60));
  console.log('   Subscription Tier:', user.subscriptionTier?.S || 'free');
  console.log('   Subscription Status:', user.subscriptionStatus?.S || 'none');
  console.log('─'.repeat(60));
  console.log('   Stripe Customer ID:', user.stripeCustomerId?.S || '❌ not set');
  console.log('   Stripe Subscription ID:', user.stripeSubscriptionId?.S || '❌ not set');
  console.log('─'.repeat(60));

  if (user.subscriptionStartDate?.S) {
    console.log('   Subscription Start:', new Date(user.subscriptionStartDate.S).toLocaleString());
  }
  if (user.subscriptionEndDate?.S) {
    console.log('   Subscription End:', new Date(user.subscriptionEndDate.S).toLocaleString());
  }
  console.log('─'.repeat(60));

  return user.id?.S;
}

async function findUserById(userId) {
  console.log(`🔍 Looking for user with ID: ${userId}\n`);

  const command = new GetItemCommand({
    TableName: 'spotter-users',
    Key: {
      id: { S: userId }
    },
    ConsistentRead: true
  });

  const response = await client.send(command);

  if (!response.Item) {
    console.log('❌ No user found with that ID');
    return;
  }

  const user = response.Item;
  console.log('✅ User found:');
  console.log('─'.repeat(60));
  console.log('   User ID:', user.id?.S || 'N/A');
  console.log('   Email:', user.email?.S || 'N/A');
  console.log('   Name:', user.name?.S || 'N/A');
  console.log('─'.repeat(60));
  console.log('   Subscription Tier:', user.subscriptionTier?.S || 'free');
  console.log('   Subscription Status:', user.subscriptionStatus?.S || 'none');
  console.log('─'.repeat(60));
  console.log('   Stripe Customer ID:', user.stripeCustomerId?.S || '❌ not set');
  console.log('   Stripe Subscription ID:', user.stripeSubscriptionId?.S || '❌ not set');
  console.log('─'.repeat(60));

  if (user.subscriptionStartDate?.S) {
    console.log('   Subscription Start:', new Date(user.subscriptionStartDate.S).toLocaleString());
  }
  if (user.subscriptionEndDate?.S) {
    console.log('   Subscription End:', new Date(user.subscriptionEndDate.S).toLocaleString());
  }
  console.log('─'.repeat(60));
}

const arg = process.argv[2];
if (!arg) {
  console.error('❌ Please provide an email address or user ID');
  console.error('Usage: node scripts/check-user-status.mjs <email|userId>');
  console.error('');
  console.error('Examples:');
  console.error('  node scripts/check-user-status.mjs alejo@cannashieldct.com');
  console.error('  node scripts/check-user-status.mjs ece4e8c9-d2eb-4850-9d25-d6ff5beef11f');
  process.exit(1);
}

// Check if it looks like a UUID (user ID) or email
if (arg.includes('@')) {
  findUserByEmail(arg).catch(console.error);
} else {
  findUserById(arg).catch(console.error);
}
