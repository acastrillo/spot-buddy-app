#!/usr/bin/env node

import { DynamoDBClient, ScanCommand } from '@aws-sdk/client-dynamodb';

const client = new DynamoDBClient({ region: 'us-east-1' });

async function listAllUsers() {
  console.log('🔍 Scanning all users in spotter-users table...\n');

  const command = new ScanCommand({
    TableName: 'spotter-users'
  });

  const response = await client.send(command);

  if (!response.Items || response.Items.length === 0) {
    console.log('❌ No users found in the table');
    return;
  }

  console.log(`✅ Found ${response.Items.length} total user(s)\n`);
  console.log('═══════════════════════════════════════════════════════════');

  // Group by email to show duplicates
  const usersByEmail = {};

  response.Items.forEach((user) => {
    const email = user.email?.S || 'no-email';
    if (!usersByEmail[email]) {
      usersByEmail[email] = [];
    }
    usersByEmail[email].push(user);
  });

  // Display grouped by email
  Object.entries(usersByEmail).forEach(([email, users]) => {
    if (users.length > 1) {
      console.log(`\n⚠️  ${users.length} DUPLICATE USERS with email: ${email}`);
    } else {
      console.log(`\n📧 ${email}`);
    }

    users.forEach((user, idx) => {
      if (users.length > 1) {
        console.log(`\n   Duplicate ${idx + 1}/${users.length}:`);
      }
      console.log('   ───────────────────────────────────────────────────────');
      console.log('   User ID:', user.id?.S || 'N/A');
      console.log('   Email:', user.email?.S || 'N/A');
      console.log('   Name:', user.name?.S || 'N/A');
      console.log('   Tier:', user.subscriptionTier?.S || 'free');
      console.log('   Status:', user.subscriptionStatus?.S || 'none');
      console.log('   Stripe Customer:', user.stripeCustomerId?.S || 'none');
      console.log('   Stripe Subscription:', user.stripeSubscriptionId?.S || 'none');
      console.log('   Created:', user.createdAt?.S ? new Date(user.createdAt.S).toLocaleString() : 'N/A');
      console.log('   Updated:', user.updatedAt?.S ? new Date(user.updatedAt.S).toLocaleString() : 'N/A');
    });
  });

  console.log('\n═══════════════════════════════════════════════════════════');

  // Summary
  const duplicateEmails = Object.entries(usersByEmail).filter(([_, users]) => users.length > 1);
  if (duplicateEmails.length > 0) {
    console.log(`\n⚠️  SUMMARY: Found ${duplicateEmails.length} email(s) with duplicates:`);
    duplicateEmails.forEach(([email, users]) => {
      console.log(`   ${email}: ${users.length} users`);
    });
  } else {
    console.log('\n✅ No duplicate emails found');
  }

  console.log(`\n📊 Total users: ${response.Items.length}`);
}

listAllUsers().catch(console.error);
