#!/usr/bin/env node

import { DynamoDBClient, ScanCommand } from '@aws-sdk/client-dynamodb';

const client = new DynamoDBClient({ region: 'us-east-1' });

async function findByStripeCustomer(customerId) {
  console.log(`🔍 Looking for user with Stripe Customer ID: ${customerId}\n`);

  const command = new ScanCommand({
    TableName: 'spotter-users',
    FilterExpression: 'stripeCustomerId = :custId',
    ExpressionAttributeValues: {
      ':custId': { S: customerId }
    }
  });

  const response = await client.send(command);

  if (!response.Items || response.Items.length === 0) {
    console.log('❌ No user found with that Stripe Customer ID');
    return;
  }

  console.log(`✅ Found ${response.Items.length} user(s):\n`);

  response.Items.forEach((user, idx) => {
    console.log(`User ${idx + 1}:`);
    console.log('────────────────────────────────────────────────────────────');
    console.log('   User ID:', user.id?.S || 'N/A');
    console.log('   Email:', user.email?.S || 'N/A');
    console.log('   Name:', user.name?.S || 'N/A');
    console.log('────────────────────────────────────────────────────────────');
    console.log('   Subscription Tier:', user.subscriptionTier?.S || 'free');
    console.log('   Subscription Status:', user.subscriptionStatus?.S || 'none');
    console.log('────────────────────────────────────────────────────────────');
    console.log('   Stripe Customer ID:', user.stripeCustomerId?.S || '❌ not set');
    console.log('   Stripe Subscription ID:', user.stripeSubscriptionId?.S || '❌ not set');
    console.log('────────────────────────────────────────────────────────────\n');
  });
}

const customerId = process.argv[2];
if (!customerId) {
  console.error('❌ Please provide a Stripe Customer ID');
  console.error('Usage: node scripts/find-by-stripe-customer.mjs <stripe-customer-id>');
  process.exit(1);
}

findByStripeCustomer(customerId).catch(console.error);
