/**
 * Create DynamoDB Workout Completions Table
 *
 * This script creates the spotter-workout-completions table in DynamoDB
 * with the proper schema for tracking workout completions.
 *
 * Usage: node scripts/create-completions-table.mjs
 */

import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  CreateTableCommand,
  DescribeTableCommand,
  waitUntilTableExists,
} from "@aws-sdk/client-dynamodb";

const client = new DynamoDBClient({ region: process.env.AWS_REGION || "us-east-1" });

const TABLE_NAME = process.env.DYNAMODB_WORKOUT_COMPLETIONS_TABLE || "spotter-workout-completions";

async function createCompletionsTable() {
  console.log(`\n🚀 Creating DynamoDB table: ${TABLE_NAME}`);
  console.log(`Region: ${process.env.AWS_REGION || "us-east-1"}\n`);

  try {
    // Check if table already exists
    try {
      const describeCommand = new DescribeTableCommand({ TableName: TABLE_NAME });
      const existingTable = await client.send(describeCommand);

      console.log(`✅ Table already exists!`);
      console.log(`   Status: ${existingTable.Table.TableStatus}`);
      console.log(`   Created: ${existingTable.Table.CreationDateTime}`);
      console.log(`   Items: ${existingTable.Table.ItemCount || 0}`);
      return;
    } catch (error) {
      if (error.name !== "ResourceNotFoundException") {
        throw error;
      }
      // Table doesn't exist, continue to create it
    }

    // Create the table
    const createCommand = new CreateTableCommand({
      TableName: TABLE_NAME,
      AttributeDefinitions: [
        {
          AttributeName: "userId",
          AttributeType: "S", // String
        },
        {
          AttributeName: "completionId",
          AttributeType: "S", // String (timestamp-based for sorting)
        },
      ],
      KeySchema: [
        {
          AttributeName: "userId",
          KeyType: "HASH", // Partition key
        },
        {
          AttributeName: "completionId",
          KeyType: "RANGE", // Sort key
        },
      ],
      BillingMode: "PAY_PER_REQUEST", // On-demand pricing
      Tags: [
        {
          Key: "Project",
          Value: "Spot Buddy",
        },
        {
          Key: "Environment",
          Value: process.env.NODE_ENV || "development",
        },
        {
          Key: "Purpose",
          Value: "Workout completion tracking",
        },
      ],
    });

    console.log("Creating table...");
    await client.send(createCommand);

    console.log("⏳ Waiting for table to become active...");
    await waitUntilTableExists(
      { client, maxWaitTime: 60, minDelay: 2, maxDelay: 5 },
      { TableName: TABLE_NAME }
    );

    console.log("\n✅ Table created successfully!");
    console.log(`   Table Name: ${TABLE_NAME}`);
    console.log(`   Partition Key: userId (String)`);
    console.log(`   Sort Key: completionId (String)`);
    console.log(`   Billing Mode: PAY_PER_REQUEST`);
    console.log(`   Region: ${process.env.AWS_REGION || "us-east-1"}`);

    console.log("\n📝 Table Schema:");
    console.log("   - userId (HASH): User ID");
    console.log("   - completionId (RANGE): Unique completion ID (timestamp-based)");
    console.log("   - workoutId: Reference to the workout");
    console.log("   - completedAt: ISO timestamp when completed");
    console.log("   - completedDate: ISO date (YYYY-MM-DD)");
    console.log("   - durationSeconds: How long the workout took");
    console.log("   - durationMinutes: Convenience field");
    console.log("   - notes: Optional notes");
    console.log("   - createdAt: Record creation timestamp");

    console.log("\n🎯 Next Steps:");
    console.log("   1. Add DYNAMODB_WORKOUT_COMPLETIONS_TABLE to your .env files");
    console.log("   2. Update ECS task IAM role to include table permissions");
    console.log("   3. Test the completions API endpoints");
    console.log("   4. Run the migration script to import existing localStorage data");

  } catch (error) {
    console.error("\n❌ Error creating table:");
    console.error(error);
    process.exit(1);
  }
}

// Run the script
createCompletionsTable();
