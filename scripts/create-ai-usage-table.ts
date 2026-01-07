/**
 * Create DynamoDB AI Usage Tracking Table
 *
 * This script creates the spotter-ai-usage table for tracking detailed AI token usage and costs.
 *
 * Usage:
 *   npx tsx scripts/create-ai-usage-table.ts
 */

import {
  DynamoDBClient,
  CreateTableCommand,
  DescribeTableCommand,
  waitUntilTableExists,
} from '@aws-sdk/client-dynamodb';

const TABLE_NAME = process.env.DYNAMODB_AI_USAGE_TABLE || 'spotter-ai-usage';
const AWS_REGION = process.env.AWS_REGION || 'us-east-1';

async function createAIUsageTable() {
  const client = new DynamoDBClient({ region: AWS_REGION });

  console.log(`Creating AI Usage table: ${TABLE_NAME}`);
  console.log(`Region: ${AWS_REGION}`);

  try {
    // Check if table already exists
    try {
      await client.send(new DescribeTableCommand({ TableName: TABLE_NAME }));
      console.log(`✓ Table ${TABLE_NAME} already exists`);
      return;
    } catch (error: any) {
      if (error.name !== 'ResourceNotFoundException') {
        throw error;
      }
      // Table doesn't exist, continue with creation
    }

    // Create table
    const createCommand = new CreateTableCommand({
      TableName: TABLE_NAME,
      KeySchema: [
        { AttributeName: 'userId', KeyType: 'HASH' },      // Partition key
        { AttributeName: 'requestId', KeyType: 'RANGE' },  // Sort key (timestamp-uuid)
      ],
      AttributeDefinitions: [
        { AttributeName: 'userId', AttributeType: 'S' },
        { AttributeName: 'requestId', AttributeType: 'S' },
        { AttributeName: 'timestamp', AttributeType: 'S' },
        { AttributeName: 'subscriptionTier', AttributeType: 'S' },
      ],
      GlobalSecondaryIndexes: [
        {
          IndexName: 'timestamp-index',
          KeySchema: [
            { AttributeName: 'userId', KeyType: 'HASH' },
            { AttributeName: 'timestamp', KeyType: 'RANGE' },
          ],
          Projection: {
            ProjectionType: 'ALL',
          },
          ProvisionedThroughput: {
            ReadCapacityUnits: 5,
            WriteCapacityUnits: 5,
          },
        },
        {
          IndexName: 'tier-timestamp-index',
          KeySchema: [
            { AttributeName: 'subscriptionTier', KeyType: 'HASH' },
            { AttributeName: 'timestamp', KeyType: 'RANGE' },
          ],
          Projection: {
            ProjectionType: 'ALL',
          },
          ProvisionedThroughput: {
            ReadCapacityUnits: 5,
            WriteCapacityUnits: 5,
          },
        },
      ],
      BillingMode: 'PROVISIONED',
      ProvisionedThroughput: {
        ReadCapacityUnits: 5,
        WriteCapacityUnits: 5,
      },
      TimeToLiveSpecification: {
        Enabled: true,
        AttributeName: 'ttl', // Automatically delete records after 30 days
      },
      Tags: [
        { Key: 'Application', Value: 'KinexFit' },
        { Key: 'Environment', Value: process.env.NODE_ENV || 'development' },
        { Key: 'Purpose', Value: 'AI Usage Tracking' },
      ],
    });

    console.log('Creating table...');
    await client.send(createCommand);

    console.log('Waiting for table to become active...');
    await waitUntilTableExists(
      { client, maxWaitTime: 120, minDelay: 5, maxDelay: 10 },
      { TableName: TABLE_NAME }
    );

    console.log(`✓ Table ${TABLE_NAME} created successfully!`);
    console.log('\nTable details:');
    console.log(`  - Partition key: userId (String)`);
    console.log(`  - Sort key: requestId (String) - timestamp-uuid format`);
    console.log(`  - GSI 1: timestamp-index - Query by user and time range`);
    console.log(`  - GSI 2: tier-timestamp-index - Query by tier and time range`);
    console.log(`  - TTL enabled: Records auto-delete after 30 days`);
    console.log(`  - Billing: Provisioned (5 RCU / 5 WCU)`);
    console.log('\nNext steps:');
    console.log('  1. Set environment variable: DYNAMODB_AI_USAGE_TABLE=' + TABLE_NAME);
    console.log('  2. Start tracking AI usage in your application');
    console.log('  3. Monitor costs via /api/admin/ai-cost-monitoring');
    console.log('  4. Users can view their usage at /api/user/ai-usage');

  } catch (error) {
    console.error('Error creating table:', error);
    throw error;
  }
}

// Run if executed directly
if (require.main === module) {
  createAIUsageTable()
    .then(() => {
      console.log('\n✓ Setup complete!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n✗ Setup failed:', error);
      process.exit(1);
    });
}

export { createAIUsageTable };
