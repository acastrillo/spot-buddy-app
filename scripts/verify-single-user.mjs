#!/usr/bin/env node

import { DynamoDBClient, ScanCommand } from '@aws-sdk/client-dynamodb';

const client = new DynamoDBClient({ region: 'us-east-1' });

async function verifySingleUser(expectedEmail) {
  console.log('🔍 Verifying single user per email...\n');

  const command = new ScanCommand({
    TableName: 'spotter-users'
  });

  const response = await client.send(command);

  if (!response.Items || response.Items.length === 0) {
    console.log('❌ No users found in the table');
    console.log('   Expected: 1 user after sign-in');
    return false;
  }

  const totalUsers = response.Items.length;
  console.log(`📊 Total users in database: ${totalUsers}\n`);

  // Group by email
  const usersByEmail = {};
  response.Items.forEach((user) => {
    const email = user.email?.S || 'no-email';
    if (!usersByEmail[email]) {
      usersByEmail[email] = [];
    }
    usersByEmail[email].push(user);
  });

  const uniqueEmails = Object.keys(usersByEmail).length;
  console.log(`📧 Unique emails: ${uniqueEmails}\n`);

  // Check for duplicates
  const duplicates = Object.entries(usersByEmail).filter(([, users]) => users.length > 1);

  if (duplicates.length > 0) {
    console.log('❌ DUPLICATE USERS FOUND!\n');
    console.log('═══════════════════════════════════════════════════════════');

    duplicates.forEach(([email, users]) => {
      console.log(`\n⚠️  ${users.length} users with email: ${email}`);
      users.forEach((user, idx) => {
        console.log(`\n   User ${idx + 1}/${users.length}:`);
        console.log('   ───────────────────────────────────────────────────────');
        console.log('   ID:', user.id?.S || 'N/A');
        console.log('   Tier:', user.subscriptionTier?.S || 'free');
        console.log('   Stripe Customer:', user.stripeCustomerId?.S || 'none');
        console.log('   Created:', user.createdAt?.S ? new Date(user.createdAt.S).toLocaleString() : 'N/A');
      });
    });

    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('\n❌ TEST FAILED: Duplicate user bug still exists!');
    console.log('   Action required: Check auth-options.ts signIn callback\n');
    return false;
  }

  // If specific email provided, check it
  if (expectedEmail) {
    const users = usersByEmail[expectedEmail];
    if (!users || users.length === 0) {
      console.log(`❌ No user found with email: ${expectedEmail}\n`);
      return false;
    }
    if (users.length > 1) {
      console.log(`❌ Found ${users.length} users with email: ${expectedEmail}\n`);
      return false;
    }

    console.log('✅ SINGLE USER VERIFIED!\n');
    console.log('═══════════════════════════════════════════════════════════');
    const user = users[0];
    console.log('   Email:', user.email?.S || 'N/A');
    console.log('   User ID:', user.id?.S || 'N/A');
    console.log('   Tier:', user.subscriptionTier?.S || 'free');
    console.log('   Status:', user.subscriptionStatus?.S || 'active');
    console.log('   Stripe Customer:', user.stripeCustomerId?.S || 'none');
    console.log('   Created:', user.createdAt?.S ? new Date(user.createdAt.S).toLocaleString() : 'N/A');
    console.log('   Updated:', user.updatedAt?.S ? new Date(user.updatedAt.S).toLocaleString() : 'N/A');
    console.log('═══════════════════════════════════════════════════════════\n');

    console.log('✅ TEST PASSED: No duplicate users found!\n');
    return true;
  }

  // No specific email - just verify no duplicates exist
  console.log('✅ NO DUPLICATES FOUND!\n');
  console.log('═══════════════════════════════════════════════════════════');
  Object.entries(usersByEmail).forEach(([email, users]) => {
    const user = users[0];
    console.log(`\n📧 ${email}`);
    console.log('   ID:', user.id?.S || 'N/A');
    console.log('   Tier:', user.subscriptionTier?.S || 'free');
    console.log('   Stripe Customer:', user.stripeCustomerId?.S || 'none');
  });
  console.log('\n═══════════════════════════════════════════════════════════\n');

  console.log('✅ TEST PASSED: All emails have single user!\n');
  return true;
}

// Usage:
// node scripts/verify-single-user.mjs
// node scripts/verify-single-user.mjs user@example.com

const expectedEmail = process.argv[2];

if (expectedEmail && !expectedEmail.includes('@')) {
  console.error('❌ Invalid email format');
  console.error('Usage: node scripts/verify-single-user.mjs [email]');
  console.error('');
  console.error('Examples:');
  console.error('  node scripts/verify-single-user.mjs');
  console.error('  node scripts/verify-single-user.mjs alejo@cannashieldct.com');
  process.exit(1);
}

verifySingleUser(expectedEmail)
  .then(success => process.exit(success ? 0 : 1))
  .catch(error => {
    console.error('❌ Error:', error.message);
    process.exit(1);
  });
