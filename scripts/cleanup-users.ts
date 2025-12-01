/**
 * Cleanup Script - Remove all users and related data
 *
 * This script:
 * 1. Deletes all users from Prisma (SQLite)
 * 2. Deletes all users from DynamoDB
 * 3. Deletes all workouts from DynamoDB
 * 4. Deletes all body metrics from DynamoDB
 */

import { PrismaClient } from '@prisma/client';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, ScanCommand, DeleteCommand } from '@aws-sdk/lib-dynamodb';

const prisma = new PrismaClient();

// DynamoDB setup
const dynamoClient = new DynamoDBClient({
  region: process.env.AWS_REGION || 'us-east-1',
});
const dynamoDb = DynamoDBDocumentClient.from(dynamoClient);

const USERS_TABLE = process.env.DYNAMODB_USERS_TABLE || 'spotter-users';
const WORKOUTS_TABLE = process.env.DYNAMODB_WORKOUTS_TABLE || 'spotter-workouts';
const BODY_METRICS_TABLE = process.env.DYNAMODB_BODY_METRICS_TABLE || 'spotter-body-metrics';

async function cleanupPrisma() {
  console.log('\n🧹 Cleaning up Prisma (SQLite) database...\n');

  try {
    // Delete in order due to foreign key constraints
    const sessionsDeleted = await prisma.session.deleteMany({});
    console.log(`✓ Deleted ${sessionsDeleted.count} sessions`);

    const accountsDeleted = await prisma.account.deleteMany({});
    console.log(`✓ Deleted ${accountsDeleted.count} accounts`);

    const tokensDeleted = await prisma.verificationToken.deleteMany({});
    console.log(`✓ Deleted ${tokensDeleted.count} verification tokens`);

    const usersDeleted = await prisma.user.deleteMany({});
    console.log(`✓ Deleted ${usersDeleted.count} users`);

    console.log('\n✅ Prisma cleanup complete!\n');
  } catch (error) {
    console.error('❌ Error cleaning up Prisma:', error);
    throw error;
  }
}

async function scanAndDeleteTable(tableName: string, keyName: string, sortKeyName?: string) {
  console.log(`\n🧹 Cleaning up DynamoDB table: ${tableName}...\n`);

  let deletedCount = 0;
  let lastEvaluatedKey = undefined;

  try {
    do {
      const scanResult = await dynamoDb.send(
        new ScanCommand({
          TableName: tableName,
          ExclusiveStartKey: lastEvaluatedKey,
        })
      );

      if (scanResult.Items && scanResult.Items.length > 0) {
        // Delete items in parallel
        const deletePromises = scanResult.Items.map((item) => {
          const key: any = { [keyName]: item[keyName] };
          if (sortKeyName && item[sortKeyName]) {
            key[sortKeyName] = item[sortKeyName];
          }

          return dynamoDb.send(
            new DeleteCommand({
              TableName: tableName,
              Key: key,
            })
          );
        });

        await Promise.all(deletePromises);
        deletedCount += scanResult.Items.length;
        console.log(`✓ Deleted ${scanResult.Items.length} items (total: ${deletedCount})`);
      }

      lastEvaluatedKey = scanResult.LastEvaluatedKey;
    } while (lastEvaluatedKey);

    console.log(`\n✅ Deleted ${deletedCount} items from ${tableName}\n`);
  } catch (error) {
    console.error(`❌ Error cleaning up ${tableName}:`, error);
    throw error;
  }
}

async function cleanupDynamoDB() {
  console.log('\n🧹 Cleaning up DynamoDB...\n');

  try {
    // Clean up workouts (userId + workoutId)
    await scanAndDeleteTable(WORKOUTS_TABLE, 'userId', 'workoutId');

    // Clean up body metrics (userId + date)
    await scanAndDeleteTable(BODY_METRICS_TABLE, 'userId', 'date');

    // Clean up users (id only)
    await scanAndDeleteTable(USERS_TABLE, 'id');

    console.log('\n✅ DynamoDB cleanup complete!\n');
  } catch (error) {
    console.error('❌ Error cleaning up DynamoDB:', error);
    throw error;
  }
}

async function main() {
  console.log('\n==========================================');
  console.log('🚨 USER CLEANUP SCRIPT 🚨');
  console.log('==========================================');
  console.log('\nThis will delete ALL users and related data!');
  console.log('\nPress Ctrl+C within 5 seconds to cancel...\n');

  // Give user time to cancel
  await new Promise(resolve => setTimeout(resolve, 5000));

  console.log('Starting cleanup...\n');

  try {
    // Clean up Prisma first
    await cleanupPrisma();

    // Then clean up DynamoDB
    await cleanupDynamoDB();

    console.log('\n==========================================');
    console.log('✅ ALL CLEANUP COMPLETE!');
    console.log('==========================================\n');
    console.log('All users, workouts, and body metrics have been deleted.');
    console.log('The database is now clean.\n');
  } catch (error) {
    console.error('\n❌ Cleanup failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
