#!/usr/bin/env node

import { DynamoDBClient, ScanCommand, DeleteItemCommand } from '@aws-sdk/client-dynamodb';

const client = new DynamoDBClient({ region: 'us-east-1' });

async function deleteAllUsers() {
  console.log('🔍 Scanning all users in spotter-users table...\n');

  const scanCommand = new ScanCommand({
    TableName: 'spotter-users'
  });

  const response = await client.send(scanCommand);

  if (!response.Items || response.Items.length === 0) {
    console.log('❌ No users found in the table');
    return;
  }

  console.log(`⚠️  Found ${response.Items.length} user(s) to DELETE\n`);
  console.log('═══════════════════════════════════════════════════════════');

  // Show what will be deleted
  response.Items.forEach((user, idx) => {
    console.log(`\nUser ${idx + 1}/${response.Items.length}:`);
    console.log('   User ID:', user.id?.S || 'N/A');
    console.log('   Email:', user.email?.S || 'N/A');
    console.log('   Tier:', user.subscriptionTier?.S || 'free');
    console.log('   Stripe Customer:', user.stripeCustomerId?.S || 'none');
  });

  console.log('\n═══════════════════════════════════════════════════════════');
  console.log(`\n⚠️  WARNING: This will DELETE ALL ${response.Items.length} users!`);
  console.log('   This action CANNOT be undone!');
  console.log('\nProceeding in 5 seconds...\n');

  await new Promise(resolve => setTimeout(resolve, 5000));

  console.log('🗑️  Starting deletion...\n');

  let deletedCount = 0;
  let failedCount = 0;

  for (const user of response.Items) {
    const userId = user.id?.S;
    const email = user.email?.S || 'no-email';

    try {
      const deleteCommand = new DeleteItemCommand({
        TableName: 'spotter-users',
        Key: {
          id: { S: userId }
        }
      });

      await client.send(deleteCommand);
      deletedCount++;
      console.log(`✅ Deleted: ${email} (${userId})`);
    } catch (error) {
      failedCount++;
      console.error(`❌ Failed to delete: ${email} (${userId})`);
      console.error(`   Error: ${error.message}`);
    }
  }

  console.log('\n═══════════════════════════════════════════════════════════');
  console.log(`\n✅ Deletion complete!`);
  console.log(`   Deleted: ${deletedCount}`);
  console.log(`   Failed: ${failedCount}`);
  console.log(`\n📝 Next steps:`);
  console.log(`   1. Sign out from kinexfit.com`);
  console.log(`   2. Sign in fresh - a new user will be created`);
  console.log(`   3. Test checkout and verify it works\n`);
}

// Safety check - require confirmation via command line arg
const confirm = process.argv[2];

if (confirm !== '--confirm') {
  console.error('⚠️  SAFETY CHECK: This will delete ALL users from the database!');
  console.error('');
  console.error('To proceed, run:');
  console.error('  node scripts/delete-all-users.mjs --confirm');
  console.error('');
  process.exit(1);
}

deleteAllUsers().catch(console.error);
