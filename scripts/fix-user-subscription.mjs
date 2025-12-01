#!/usr/bin/env node

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, UpdateCommand } from '@aws-sdk/lib-dynamodb';

const client = new DynamoDBClient({ region: 'us-east-1' });
const dynamodb = DynamoDBDocumentClient.from(client);

const userId = '4418d428-d071-7001-8ee2-aaf0a4b55f7b';

console.log(`\n🔧 Manually updating subscription for user: ${userId}\n`);

try {
  // From webhook logs: tier=elite, subscriptionId=sub_1SYuAnHdCvK1ftFgAO9Zg2Aq
  const result = await dynamodb.send(
    new UpdateCommand({
      TableName: 'spotter-users',
      Key: { id: userId },
      UpdateExpression: 'SET subscriptionTier = :tier, subscriptionStatus = :status, stripeSubscriptionId = :subId, updatedAt = :updatedAt',
      ExpressionAttributeValues: {
        ':tier': 'elite',
        ':status': 'active',
        ':subId': 'sub_1SYuAnHdCvK1ftFgAO9Zg2Aq',
        ':updatedAt': new Date().toISOString(),
      },
      ReturnValues: 'ALL_NEW',
    })
  );

  console.log('✅ Subscription updated successfully!\n');
  console.log('Updated attributes:');
  console.log(`   Tier: ${result.Attributes.subscriptionTier}`);
  console.log(`   Status: ${result.Attributes.subscriptionStatus}`);
  console.log(`   Subscription ID: ${result.Attributes.stripeSubscriptionId}`);
  console.log(`   Updated At: ${result.Attributes.updatedAt}\n`);

  process.exit(0);
} catch (error) {
  console.error('❌ Error updating subscription:', error);
  process.exit(1);
}
