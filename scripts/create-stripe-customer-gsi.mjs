#!/usr/bin/env node

import { DynamoDBClient, UpdateTableCommand, DescribeTableCommand } from '@aws-sdk/client-dynamodb';

const client = new DynamoDBClient({ region: 'us-east-1' });
const TABLE_NAME = 'spotter-users';
const INDEX_NAME = 'stripeCustomerId-index';

async function createStripeCustomerIdIndex() {
  console.log(`🔍 Checking if ${INDEX_NAME} already exists...\\n`);

  // Check if index already exists
  try {
    const describeCommand = new DescribeTableCommand({
      TableName: TABLE_NAME
    });
    const tableInfo = await client.send(describeCommand);

    const existingIndex = tableInfo.Table?.GlobalSecondaryIndexes?.find(
      idx => idx.IndexName === INDEX_NAME
    );

    if (existingIndex) {
      console.log(`✅ Index ${INDEX_NAME} already exists with status: ${existingIndex.IndexStatus}`);
      console.log('   No action needed.\\n');
      return;
    }
  } catch (error) {
    console.error('❌ Error checking table:', error.message);
    process.exit(1);
  }

  console.log(`⚙️  Creating Global Secondary Index: ${INDEX_NAME}\\n`);
  console.log('This operation will:');
  console.log('   1. Add stripeCustomerId as a searchable field');
  console.log('   2. Enable fast webhook user lookups');
  console.log('   3. Take 5-10 minutes to complete (table remains usable)\\n');

  console.log('⚠️  This will consume additional write capacity during creation.');
  console.log('   Press Ctrl+C now to cancel, or wait 5 seconds to proceed...\\n');

  await new Promise(resolve => setTimeout(resolve, 5000));

  try {
    const updateCommand = new UpdateTableCommand({
      TableName: TABLE_NAME,
      AttributeDefinitions: [
        {
          AttributeName: 'stripeCustomerId',
          AttributeType: 'S' // String type
        }
      ],
      GlobalSecondaryIndexUpdates: [
        {
          Create: {
            IndexName: INDEX_NAME,
            KeySchema: [
              {
                AttributeName: 'stripeCustomerId',
                KeyType: 'HASH' // Partition key
              }
            ],
            Projection: {
              ProjectionType: 'ALL' // Include all attributes
            }
            // Note: No ProvisionedThroughput needed - table uses PAY_PER_REQUEST billing
          }
        }
      ]
    });

    await client.send(updateCommand);

    console.log('✅ GSI creation initiated successfully!\\n');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('   Index Status: CREATING');
    console.log('   Expected time: 5-10 minutes');
    console.log('   Table remains available during creation');
    console.log('═══════════════════════════════════════════════════════════\\n');

    console.log('📊 To check status, run:');
    console.log(`   aws dynamodb describe-table --table-name ${TABLE_NAME} --region us-east-1 --query "Table.GlobalSecondaryIndexes[?IndexName==\\'${INDEX_NAME}\\'].IndexStatus" --output text\\n`);

    console.log('⏳ Waiting for index to become ACTIVE...');
    console.log('   (You can Ctrl+C now - creation will continue in background)\\n');

    // Poll for ACTIVE status
    let attempts = 0;
    const maxAttempts = 60; // 10 minutes max (10 second intervals)

    while (attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 10000)); // Wait 10 seconds
      attempts++;

      const checkCommand = new DescribeTableCommand({
        TableName: TABLE_NAME
      });
      const tableInfo = await client.send(checkCommand);

      const index = tableInfo.Table?.GlobalSecondaryIndexes?.find(
        idx => idx.IndexName === INDEX_NAME
      );

      if (index?.IndexStatus === 'ACTIVE') {
        console.log('\\n✅ Index is now ACTIVE!\\n');
        console.log('═══════════════════════════════════════════════════════════');
        console.log(`   Index: ${INDEX_NAME}`);
        console.log('   Status: ACTIVE');
        console.log('   Table: spotter-users');
        console.log('═══════════════════════════════════════════════════════════\\n');
        console.log('✅ Stripe webhook lookups will now be faster and more reliable!\\n');
        return;
      }

      process.stdout.write(`   Attempt ${attempts}/${maxAttempts}: Status = ${index?.IndexStatus || 'UNKNOWN'}\\r`);
    }

    console.log('\\n⚠️  Timeout waiting for index to become ACTIVE.');
    console.log('   Index is still being created in the background.');
    console.log('   Check status with the aws CLI command above.\\n');

  } catch (error) {
    console.error('\\n❌ Error creating GSI:', error.message);
    if (error.code === 'LimitExceededException') {
      console.error('   Only one index can be created at a time. Try again later.');
    } else if (error.code === 'ResourceInUseException') {
      console.error('   Table is currently being updated. Try again in a few minutes.');
    }
    process.exit(1);
  }
}

createStripeCustomerIdIndex().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
