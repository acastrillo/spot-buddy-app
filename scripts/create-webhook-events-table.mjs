#!/usr/bin/env node

import {
  DynamoDBClient,
  CreateTableCommand,
  DescribeTableCommand,
  UpdateTimeToLiveCommand,
  DescribeTimeToLiveCommand
} from '@aws-sdk/client-dynamodb';

const client = new DynamoDBClient({ region: 'us-east-1' });
const TABLE_NAME = 'spotter-webhook-events';

async function createWebhookEventsTable() {
  console.log(`🔍 Checking if ${TABLE_NAME} already exists...\n`);

  // Check if table already exists
  try {
    const describeCommand = new DescribeTableCommand({
      TableName: TABLE_NAME
    });
    const tableInfo = await client.send(describeCommand);

    if (tableInfo.Table) {
      console.log(`✅ Table ${TABLE_NAME} already exists with status: ${tableInfo.Table.TableStatus}`);

      // Check if TTL is enabled
      const ttlCommand = new DescribeTimeToLiveCommand({
        TableName: TABLE_NAME
      });
      const ttlInfo = await client.send(ttlCommand);

      if (ttlInfo.TimeToLiveDescription?.TimeToLiveStatus === 'ENABLED') {
        console.log(`✅ TTL is enabled on field: ${ttlInfo.TimeToLiveDescription.AttributeName}`);
        console.log('   No action needed.\n');
        return;
      } else {
        console.log(`⚠️  TTL is not enabled. Enabling now...\n`);
        await enableTTL();
        return;
      }
    }
  } catch (error) {
    if (error.name !== 'ResourceNotFoundException') {
      console.error('❌ Error checking table:', error.message);
      process.exit(1);
    }
    // Table doesn't exist, proceed with creation
  }

  console.log(`⚙️  Creating DynamoDB Table: ${TABLE_NAME}\n`);
  console.log('This table will:');
  console.log('   1. Track processed Stripe webhook events');
  console.log('   2. Prevent duplicate webhook processing (idempotency)');
  console.log('   3. Auto-expire events after 7 days (via TTL)\n');

  console.log('⚠️  This will create a new table with PAY_PER_REQUEST billing.');
  console.log('   Press Ctrl+C now to cancel, or wait 5 seconds to proceed...\n');

  await new Promise(resolve => setTimeout(resolve, 5000));

  try {
    const createCommand = new CreateTableCommand({
      TableName: TABLE_NAME,
      AttributeDefinitions: [
        {
          AttributeName: 'eventId',
          AttributeType: 'S' // String type (Stripe event ID like "evt_...")
        }
      ],
      KeySchema: [
        {
          AttributeName: 'eventId',
          KeyType: 'HASH' // Partition key
        }
      ],
      BillingMode: 'PAY_PER_REQUEST', // On-demand pricing (no need to provision capacity)
      Tags: [
        {
          Key: 'Purpose',
          Value: 'Stripe webhook idempotency tracking'
        },
        {
          Key: 'Application',
          Value: 'Spotter'
        }
      ]
    });

    await client.send(createCommand);

    console.log('✅ Table creation initiated successfully!\n');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('   Table Status: CREATING');
    console.log('   Expected time: 1-2 minutes');
    console.log('═══════════════════════════════════════════════════════════\n');

    console.log('⏳ Waiting for table to become ACTIVE...\n');

    // Poll for ACTIVE status
    let attempts = 0;
    const maxAttempts = 24; // 2 minutes max (5 second intervals)

    while (attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds
      attempts++;

      const checkCommand = new DescribeTableCommand({
        TableName: TABLE_NAME
      });
      const tableInfo = await client.send(checkCommand);

      if (tableInfo.Table?.TableStatus === 'ACTIVE') {
        console.log('\n✅ Table is now ACTIVE!\n');

        // Enable TTL
        await enableTTL();

        console.log('═══════════════════════════════════════════════════════════');
        console.log(`   Table: ${TABLE_NAME}`);
        console.log('   Status: ACTIVE');
        console.log('   Billing: PAY_PER_REQUEST');
        console.log('   TTL: Enabled (7 day auto-expiration)');
        console.log('═══════════════════════════════════════════════════════════\n');
        console.log('✅ Webhook idempotency tracking is now enabled!\n');
        return;
      }

      process.stdout.write(`   Attempt ${attempts}/${maxAttempts}: Status = ${tableInfo.Table?.TableStatus || 'UNKNOWN'}\r`);
    }

    console.log('\n⚠️  Timeout waiting for table to become ACTIVE.');
    console.log('   Table is still being created in the background.');
    console.log('   Check status with: aws dynamodb describe-table --table-name ' + TABLE_NAME + '\n');

  } catch (error) {
    console.error('\n❌ Error creating table:', error.message);
    if (error.code === 'ResourceInUseException') {
      console.error('   Table already exists or is being created. Try describing it instead.');
    } else if (error.code === 'LimitExceededException') {
      console.error('   AWS account table limit reached. Contact AWS support to increase limits.');
    }
    process.exit(1);
  }
}

async function enableTTL() {
  try {
    const ttlCommand = new UpdateTimeToLiveCommand({
      TableName: TABLE_NAME,
      TimeToLiveSpecification: {
        Enabled: true,
        AttributeName: 'ttl'
      }
    });

    await client.send(ttlCommand);
    console.log('✅ TTL enabled on "ttl" attribute (7-day auto-expiration)\n');
  } catch (error) {
    console.error('❌ Error enabling TTL:', error.message);
    console.error('   You can enable it manually later with:');
    console.error(`   aws dynamodb update-time-to-live --table-name ${TABLE_NAME} --time-to-live-specification "Enabled=true,AttributeName=ttl"\n`);
  }
}

createWebhookEventsTable().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
