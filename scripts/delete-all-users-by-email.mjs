#!/usr/bin/env node

import { DynamoDBClient, DeleteItemCommand, ScanCommand } from '@aws-sdk/client-dynamodb';

const client = new DynamoDBClient({ region: 'us-east-1' });

async function deleteAllByEmail(email) {
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
    console.log('❌ No users found with that email');
    return;
  }

  console.log(`Found ${response.Items.length} user(s) to delete\n`);

  for (const user of response.Items) {
    const userId = user.id?.S;
    const stripeCustomerId = user.stripeCustomerId?.S || 'none';
    const tier = user.subscriptionTier?.S || 'free';

    console.log(`🗑️  Deleting: ${userId}`);
    console.log(`   Email: ${user.email?.S}`);
    console.log(`   Stripe Customer: ${stripeCustomerId}`);
    console.log(`   Tier: ${tier}`);

    const deleteCommand = new DeleteItemCommand({
      TableName: 'spotter-users',
      Key: {
        id: { S: userId }
      }
    });

    await client.send(deleteCommand);
    console.log(`   ✅ Deleted\n`);
  }

  console.log(`\n✅ All done! Deleted ${response.Items.length} user(s).`);
  console.log(`\n📝 Next steps:`);
  console.log(`   1. Sign out completely from spotter.cannashieldct.com`);
  console.log(`   2. Sign in with ${email}`);
  console.log(`   3. A fresh user will be created`);
  console.log(`   4. Test checkout and verify the upgrade sticks\n`);
}

const email = process.argv[2];

if (!email) {
  console.error('❌ Missing email address');
  console.error('Usage: node scripts/delete-all-users-by-email.mjs <email>');
  console.error('');
  console.error('Example:');
  console.error('  node scripts/delete-all-users-by-email.mjs alejo@cannashieldct.com');
  process.exit(1);
}

// Safety check - confirm email looks valid
if (!email.includes('@')) {
  console.error('❌ Invalid email address format');
  process.exit(1);
}

console.log('⚠️  WARNING: This will DELETE ALL users with this email!');
console.log(`   Email: ${email}\n`);
console.log('Proceeding in 3 seconds...\n');

setTimeout(() => {
  deleteAllByEmail(email).catch(console.error);
}, 3000);
