#!/usr/bin/env node

import { DynamoDBClient, ScanCommand } from '@aws-sdk/client-dynamodb';

const client = new DynamoDBClient({ region: 'us-east-1' });

async function findAllByEmail(email) {
  console.log(`🔍 Looking for ALL users with email: ${email}\n`);

  const command = new ScanCommand({
    TableName: 'spotter-users',
    FilterExpression: 'email = :email',
    ExpressionAttributeValues: {
      ':email': { S: email }
    }
  });

  const response = await client.send(command);

  if (!response.Items || response.Items.length === 0) {
    console.log('❌ No users found with that email');
    return;
  }

  console.log(`✅ Found ${response.Items.length} user(s) with this email:\n`);

  response.Items.forEach((user, idx) => {
    console.log(`═══════════════════════════════════════════════════════════`);
    console.log(`User ${idx + 1}:`);
    console.log('───────────────────────────────────────────────────────────');
    console.log('   User ID:', user.id?.S || 'N/A');
    console.log('   Email:', user.email?.S || 'N/A');
    console.log('   Name:', user.name?.S || 'N/A');
    console.log('───────────────────────────────────────────────────────────');
    console.log('   Subscription Tier:', user.subscriptionTier?.S || 'free');
    console.log('   Subscription Status:', user.subscriptionStatus?.S || 'none');
    console.log('───────────────────────────────────────────────────────────');
    console.log('   Stripe Customer ID:', user.stripeCustomerId?.S || '❌ not set');
    console.log('   Stripe Subscription ID:', user.stripeSubscriptionId?.S || '❌ not set');
    console.log('───────────────────────────────────────────────────────────');
    console.log('   Created:', user.createdAt?.S || 'N/A');
    console.log('   Updated:', user.updatedAt?.S || 'N/A');
    console.log('═══════════════════════════════════════════════════════════\n');
  });

  if (response.Items.length > 1) {
    console.log('⚠️  WARNING: Multiple users with the same email detected!');
    console.log('   This can cause checkout/webhook issues.');
    console.log('   You should delete the duplicate user(s).\n');
  }
}

const email = process.argv[2];
if (!email) {
  console.error('❌ Please provide an email address');
  console.error('Usage: node scripts/find-all-by-email.mjs <email>');
  process.exit(1);
}

findAllByEmail(email).catch(console.error);
