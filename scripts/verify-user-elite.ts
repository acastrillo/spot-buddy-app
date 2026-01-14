#!/usr/bin/env tsx
/**
 * Verify user is Elite tier in AWS DynamoDB
 */

import { dynamoDBUsers } from '../src/lib/dynamodb';

async function verifyUser() {
  try {
    const user = await dynamoDBUsers.getByEmail('sino0491@gmail.com');

    if (!user) {
      console.error('❌ User not found');
      process.exit(1);
    }

    console.log('\n📊 User Details (from AWS DynamoDB):');
    console.log('=====================================');
    console.log(`Email: ${user.email}`);
    console.log(`ID: ${user.id}`);
    console.log(`Tier: ${user.subscriptionTier}`);
    console.log(`Status: ${user.subscriptionStatus}`);
    console.log(`Start Date: ${user.subscriptionStartDate}`);
    console.log(`Updated At: ${user.updatedAt}`);
    console.log('=====================================\n');

    if (user.subscriptionTier === 'elite' && user.subscriptionStatus === 'active') {
      console.log('✅ VERIFIED: User is Elite tier with active status in AWS DynamoDB');
    } else {
      console.log(`❌ MISMATCH: Expected elite/active, got ${user.subscriptionTier}/${user.subscriptionStatus}`);
    }

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

verifyUser();
