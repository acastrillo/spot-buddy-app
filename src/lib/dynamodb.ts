import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  UpdateCommand,
  QueryCommand,
  DeleteCommand,
} from "@aws-sdk/lib-dynamodb";

// Initialize DynamoDB client
const client = new DynamoDBClient({
  region: process.env.AWS_REGION || "us-east-1",
});

const dynamoDb = DynamoDBDocumentClient.from(client);

// Table names from environment
const USERS_TABLE = process.env.DYNAMODB_USERS_TABLE || "spotter-users";
const WORKOUTS_TABLE = process.env.DYNAMODB_WORKOUTS_TABLE || "spotter-workouts";

// User type matching Prisma schema + subscription fields
// Note: Dates are stored as ISO strings in DynamoDB
export interface DynamoDBUser {
  id: string;
  email: string;
  firstName?: string | null;
  lastName?: string | null;
  emailVerified?: string | null;
  image?: string | null;
  createdAt: string;
  updatedAt: string;

  // Subscription & Billing
  subscriptionTier: "free" | "starter" | "pro" | "elite";
  subscriptionStatus: "active" | "inactive" | "trialing" | "canceled" | "past_due";
  subscriptionStartDate?: string | null;
  subscriptionEndDate?: string | null;
  trialEndsAt?: string | null;
  stripeCustomerId?: string | null;
  stripeSubscriptionId?: string | null;

  // Usage Tracking & Quotas
  ocrQuotaUsed: number;
  ocrQuotaLimit: number;
  ocrQuotaResetDate?: string | null;
  workoutsSaved: number;
}

// User operations
export const dynamoDBUsers = {
  /**
   * Get user by ID
   */
  async get(userId: string): Promise<DynamoDBUser | null> {
    try {
      const result = await dynamoDb.send(
        new GetCommand({
          TableName: USERS_TABLE,
          Key: { id: userId },
        })
      );

      return result.Item as DynamoDBUser | null;
    } catch (error) {
      console.error("Error getting user from DynamoDB:", error);
      return null;
    }
  },

  /**
   * Get user by email
   */
  async getByEmail(email: string): Promise<DynamoDBUser | null> {
    try {
      const result = await dynamoDb.send(
        new QueryCommand({
          TableName: USERS_TABLE,
          IndexName: "email-index", // Assumes GSI on email field
          KeyConditionExpression: "email = :email",
          ExpressionAttributeValues: {
            ":email": email,
          },
        })
      );

      return (result.Items?.[0] as DynamoDBUser) || null;
    } catch (error) {
      console.error("Error querying user by email from DynamoDB:", error);
      return null;
    }
  },

  /**
   * Create or update user (upsert)
   */
  async upsert(user: Partial<DynamoDBUser> & { id: string; email: string }): Promise<DynamoDBUser> {
    const now = new Date().toISOString();
    const userData: DynamoDBUser = {
      id: user.id,
      email: user.email,
      firstName: user.firstName || null,
      lastName: user.lastName || null,
      emailVerified: user.emailVerified || null,
      image: user.image || null,
      createdAt: user.createdAt || now,
      updatedAt: now,

      // Subscription defaults
      subscriptionTier: user.subscriptionTier || "free",
      subscriptionStatus: user.subscriptionStatus || "active",
      subscriptionStartDate: user.subscriptionStartDate || null,
      subscriptionEndDate: user.subscriptionEndDate || null,
      trialEndsAt: user.trialEndsAt || null,
      stripeCustomerId: user.stripeCustomerId || null,
      stripeSubscriptionId: user.stripeSubscriptionId || null,

      // Usage tracking defaults
      ocrQuotaUsed: user.ocrQuotaUsed || 0,
      ocrQuotaLimit: user.ocrQuotaLimit || 2, // Free tier default: 2 per week
      ocrQuotaResetDate: user.ocrQuotaResetDate || now,
      workoutsSaved: user.workoutsSaved || 0,
    };

    try {
      await dynamoDb.send(
        new PutCommand({
          TableName: USERS_TABLE,
          Item: userData,
        })
      );

      return userData;
    } catch (error) {
      console.error("Error upserting user to DynamoDB:", error);
      throw error;
    }
  },

  /**
   * Update subscription tier
   */
  async updateSubscription(
    userId: string,
    subscription: {
      tier: "free" | "starter" | "pro" | "elite";
      status: "active" | "inactive" | "trialing" | "canceled" | "past_due";
      stripeCustomerId?: string;
      stripeSubscriptionId?: string;
      startDate?: Date;
      endDate?: Date;
    }
  ): Promise<void> {
    try {
      await dynamoDb.send(
        new UpdateCommand({
          TableName: USERS_TABLE,
          Key: { id: userId },
          UpdateExpression:
            "SET subscriptionTier = :tier, subscriptionStatus = :status, " +
            "stripeCustomerId = :customerId, stripeSubscriptionId = :subscriptionId, " +
            "subscriptionStartDate = :startDate, subscriptionEndDate = :endDate, " +
            "updatedAt = :updatedAt",
          ExpressionAttributeValues: {
            ":tier": subscription.tier,
            ":status": subscription.status,
            ":customerId": subscription.stripeCustomerId || null,
            ":subscriptionId": subscription.stripeSubscriptionId || null,
            ":startDate": subscription.startDate?.toISOString() || null,
            ":endDate": subscription.endDate?.toISOString() || null,
            ":updatedAt": new Date().toISOString(),
          },
        })
      );
    } catch (error) {
      console.error("Error updating subscription in DynamoDB:", error);
      throw error;
    }
  },

  /**
   * Increment OCR usage counter
   */
  async incrementOCRUsage(userId: string): Promise<void> {
    try {
      await dynamoDb.send(
        new UpdateCommand({
          TableName: USERS_TABLE,
          Key: { id: userId },
          UpdateExpression: "SET ocrQuotaUsed = ocrQuotaUsed + :inc, updatedAt = :updatedAt",
          ExpressionAttributeValues: {
            ":inc": 1,
            ":updatedAt": new Date().toISOString(),
          },
        })
      );
    } catch (error) {
      console.error("Error incrementing OCR usage in DynamoDB:", error);
      throw error;
    }
  },

  /**
   * Reset OCR quota (weekly reset)
   */
  async resetOCRQuota(userId: string): Promise<void> {
    try {
      const now = new Date().toISOString();
      await dynamoDb.send(
        new UpdateCommand({
          TableName: USERS_TABLE,
          Key: { id: userId },
          UpdateExpression:
            "SET ocrQuotaUsed = :zero, ocrQuotaResetDate = :resetDate, updatedAt = :updatedAt",
          ExpressionAttributeValues: {
            ":zero": 0,
            ":resetDate": now,
            ":updatedAt": now,
          },
        })
      );
    } catch (error) {
      console.error("Error resetting OCR quota in DynamoDB:", error);
      throw error;
    }
  },

  /**
   * Delete user
   */
  async delete(userId: string): Promise<void> {
    try {
      await dynamoDb.send(
        new DeleteCommand({
          TableName: USERS_TABLE,
          Key: { id: userId },
        })
      );
    } catch (error) {
      console.error("Error deleting user from DynamoDB:", error);
      throw error;
    }
  },
};

// Workout types
export interface DynamoDBExercise {
  id: string;
  name: string;
  sets: number;
  reps: string | number;
  weight?: string | null;
  restSeconds?: number | null;
  notes?: string | null;
}

export interface DynamoDBWorkout {
  userId: string; // Partition key
  workoutId: string; // Sort key
  title: string;
  description?: string | null;
  exercises: DynamoDBExercise[];
  content: string; // Original caption/text
  author?: { username: string } | null;
  createdAt: string; // ISO timestamp
  updatedAt: string; // ISO timestamp
  source: string; // URL or 'manual'
  type: string; // 'url' or 'manual'
  totalDuration: number; // Minutes
  difficulty: string; // 'easy', 'moderate', 'hard'
  tags: string[];
  llmData?: any | null; // AI-parsed data
  imageUrls?: string[]; // S3 image URLs
  thumbnailUrl?: string | null; // Primary thumbnail
}

// Workout operations
export const dynamoDBWorkouts = {
  /**
   * Get all workouts for a user
   */
  async list(userId: string, limit?: number): Promise<DynamoDBWorkout[]> {
    try {
      const result = await dynamoDb.send(
        new QueryCommand({
          TableName: WORKOUTS_TABLE,
          KeyConditionExpression: "userId = :userId",
          ExpressionAttributeValues: {
            ":userId": userId,
          },
          ScanIndexForward: false, // Most recent first
          Limit: limit,
        })
      );

      return (result.Items as DynamoDBWorkout[]) || [];
    } catch (error) {
      console.error("Error listing workouts from DynamoDB:", error);
      return [];
    }
  },

  /**
   * Get a specific workout
   */
  async get(userId: string, workoutId: string): Promise<DynamoDBWorkout | null> {
    try {
      const result = await dynamoDb.send(
        new GetCommand({
          TableName: WORKOUTS_TABLE,
          Key: { userId, workoutId },
        })
      );

      return result.Item as DynamoDBWorkout | null;
    } catch (error) {
      console.error("Error getting workout from DynamoDB:", error);
      return null;
    }
  },

  /**
   * Create or update a workout (upsert)
   */
  async upsert(
    userId: string,
    workout: Omit<DynamoDBWorkout, "userId" | "createdAt" | "updatedAt"> & {
      createdAt?: string;
    }
  ): Promise<DynamoDBWorkout> {
    const now = new Date().toISOString();
    const workoutData: DynamoDBWorkout = {
      userId,
      workoutId: workout.workoutId,
      title: workout.title,
      description: workout.description || null,
      exercises: workout.exercises,
      content: workout.content,
      author: workout.author || null,
      createdAt: workout.createdAt || now,
      updatedAt: now,
      source: workout.source,
      type: workout.type,
      totalDuration: workout.totalDuration,
      difficulty: workout.difficulty,
      tags: workout.tags || [],
      llmData: workout.llmData || null,
    };

    try {
      await dynamoDb.send(
        new PutCommand({
          TableName: WORKOUTS_TABLE,
          Item: workoutData,
        })
      );

      return workoutData;
    } catch (error) {
      console.error("Error upserting workout to DynamoDB:", error);
      throw error;
    }
  },

  /**
   * Update workout fields
   */
  async update(
    userId: string,
    workoutId: string,
    updates: {
      title?: string;
      description?: string;
      exercises?: DynamoDBExercise[];
      totalDuration?: number;
      difficulty?: string;
      tags?: string[];
    }
  ): Promise<void> {
    try {
      const updateExpressions: string[] = [];
      const attributeValues: Record<string, any> = {
        ":updatedAt": new Date().toISOString(),
      };
      const attributeNames: Record<string, string> = {};

      if (updates.title !== undefined) {
        updateExpressions.push("title = :title");
        attributeValues[":title"] = updates.title;
      }
      if (updates.description !== undefined) {
        updateExpressions.push("description = :description");
        attributeValues[":description"] = updates.description;
      }
      if (updates.exercises !== undefined) {
        updateExpressions.push("exercises = :exercises");
        attributeValues[":exercises"] = updates.exercises;
      }
      if (updates.totalDuration !== undefined) {
        updateExpressions.push("totalDuration = :totalDuration");
        attributeValues[":totalDuration"] = updates.totalDuration;
      }
      if (updates.difficulty !== undefined) {
        updateExpressions.push("difficulty = :difficulty");
        attributeValues[":difficulty"] = updates.difficulty;
      }
      if (updates.tags !== undefined) {
        updateExpressions.push("#tags = :tags");
        attributeValues[":tags"] = updates.tags;
        attributeNames["#tags"] = "tags"; // Reserved keyword
      }

      await dynamoDb.send(
        new UpdateCommand({
          TableName: WORKOUTS_TABLE,
          Key: { userId, workoutId },
          UpdateExpression: `SET ${updateExpressions.join(", ")}, updatedAt = :updatedAt`,
          ExpressionAttributeValues: attributeValues,
          ...(Object.keys(attributeNames).length > 0 && {
            ExpressionAttributeNames: attributeNames,
          }),
        })
      );
    } catch (error) {
      console.error("Error updating workout in DynamoDB:", error);
      throw error;
    }
  },

  /**
   * Delete a workout
   */
  async delete(userId: string, workoutId: string): Promise<void> {
    try {
      await dynamoDb.send(
        new DeleteCommand({
          TableName: WORKOUTS_TABLE,
          Key: { userId, workoutId },
        })
      );
    } catch (error) {
      console.error("Error deleting workout from DynamoDB:", error);
      throw error;
    }
  },

  /**
   * Query workouts by date range
   */
  async getByDateRange(
    userId: string,
    startDate: string,
    endDate: string
  ): Promise<DynamoDBWorkout[]> {
    try {
      const result = await dynamoDb.send(
        new QueryCommand({
          TableName: WORKOUTS_TABLE,
          KeyConditionExpression: "userId = :userId",
          FilterExpression: "createdAt BETWEEN :startDate AND :endDate",
          ExpressionAttributeValues: {
            ":userId": userId,
            ":startDate": startDate,
            ":endDate": endDate,
          },
          ScanIndexForward: false,
        })
      );

      return (result.Items as DynamoDBWorkout[]) || [];
    } catch (error) {
      console.error("Error querying workouts by date range:", error);
      return [];
    }
  },

  /**
   * Search workouts by title or content
   */
  async search(userId: string, searchTerm: string): Promise<DynamoDBWorkout[]> {
    try {
      const result = await dynamoDb.send(
        new QueryCommand({
          TableName: WORKOUTS_TABLE,
          KeyConditionExpression: "userId = :userId",
          FilterExpression:
            "contains(#title, :searchTerm) OR contains(#content, :searchTerm)",
          ExpressionAttributeNames: {
            "#title": "title",
            "#content": "content",
          },
          ExpressionAttributeValues: {
            ":userId": userId,
            ":searchTerm": searchTerm,
          },
        })
      );

      return (result.Items as DynamoDBWorkout[]) || [];
    } catch (error) {
      console.error("Error searching workouts:", error);
      return [];
    }
  },
};

// Body Metrics table
const BODY_METRICS_TABLE = process.env.DYNAMODB_BODY_METRICS_TABLE || "spotter-body-metrics";

// Body Metrics types
export interface DynamoDBBodyMetric {
  userId: string; // Partition key
  date: string; // Sort key (ISO date: YYYY-MM-DD)
  weight?: number | null; // kg or lbs
  bodyFatPercentage?: number | null;
  muscleMass?: number | null; // kg or lbs

  // Measurements (cm or inches)
  chest?: number | null;
  waist?: number | null;
  hips?: number | null;
  thighs?: number | null;
  arms?: number | null;
  calves?: number | null;
  shoulders?: number | null;
  neck?: number | null;

  // Metadata
  unit: "metric" | "imperial"; // kg/cm or lbs/inches
  notes?: string | null;
  photoUrls?: string[]; // Progress photos
  createdAt: string; // ISO timestamp
  updatedAt: string; // ISO timestamp
}

// Body Metrics operations
export const dynamoDBBodyMetrics = {
  /**
   * Get all body metrics for a user
   */
  async list(userId: string, limit?: number): Promise<DynamoDBBodyMetric[]> {
    try {
      const result = await dynamoDb.send(
        new QueryCommand({
          TableName: BODY_METRICS_TABLE,
          KeyConditionExpression: "userId = :userId",
          ExpressionAttributeValues: {
            ":userId": userId,
          },
          ScanIndexForward: false, // Most recent first
          Limit: limit,
        })
      );

      return (result.Items as DynamoDBBodyMetric[]) || [];
    } catch (error) {
      console.error("Error listing body metrics from DynamoDB:", error);
      return [];
    }
  },

  /**
   * Get body metrics for a specific date
   */
  async get(userId: string, date: string): Promise<DynamoDBBodyMetric | null> {
    try {
      const result = await dynamoDb.send(
        new GetCommand({
          TableName: BODY_METRICS_TABLE,
          Key: { userId, date },
        })
      );

      return result.Item as DynamoDBBodyMetric | null;
    } catch (error) {
      console.error("Error getting body metric from DynamoDB:", error);
      return null;
    }
  },

  /**
   * Get body metrics by date range
   */
  async getByDateRange(
    userId: string,
    startDate: string,
    endDate: string
  ): Promise<DynamoDBBodyMetric[]> {
    try {
      const result = await dynamoDb.send(
        new QueryCommand({
          TableName: BODY_METRICS_TABLE,
          KeyConditionExpression: "userId = :userId AND #date BETWEEN :startDate AND :endDate",
          ExpressionAttributeNames: {
            "#date": "date", // Reserved keyword
          },
          ExpressionAttributeValues: {
            ":userId": userId,
            ":startDate": startDate,
            ":endDate": endDate,
          },
          ScanIndexForward: false,
        })
      );

      return (result.Items as DynamoDBBodyMetric[]) || [];
    } catch (error) {
      console.error("Error querying body metrics by date range:", error);
      return [];
    }
  },

  /**
   * Create or update body metric (upsert)
   */
  async upsert(
    userId: string,
    metric: Omit<DynamoDBBodyMetric, "userId" | "createdAt" | "updatedAt"> & {
      createdAt?: string;
    }
  ): Promise<DynamoDBBodyMetric> {
    const now = new Date().toISOString();
    const metricData: DynamoDBBodyMetric = {
      userId,
      date: metric.date,
      weight: metric.weight ?? null,
      bodyFatPercentage: metric.bodyFatPercentage ?? null,
      muscleMass: metric.muscleMass ?? null,
      chest: metric.chest ?? null,
      waist: metric.waist ?? null,
      hips: metric.hips ?? null,
      thighs: metric.thighs ?? null,
      arms: metric.arms ?? null,
      calves: metric.calves ?? null,
      shoulders: metric.shoulders ?? null,
      neck: metric.neck ?? null,
      unit: metric.unit || "metric",
      notes: metric.notes ?? null,
      photoUrls: metric.photoUrls || [],
      createdAt: metric.createdAt || now,
      updatedAt: now,
    };

    try {
      await dynamoDb.send(
        new PutCommand({
          TableName: BODY_METRICS_TABLE,
          Item: metricData,
        })
      );

      return metricData;
    } catch (error) {
      console.error("Error upserting body metric to DynamoDB:", error);
      throw error;
    }
  },

  /**
   * Delete body metric
   */
  async delete(userId: string, date: string): Promise<void> {
    try {
      await dynamoDb.send(
        new DeleteCommand({
          TableName: BODY_METRICS_TABLE,
          Key: { userId, date },
        })
      );
    } catch (error) {
      console.error("Error deleting body metric from DynamoDB:", error);
      throw error;
    }
  },

  /**
   * Get latest body metrics (most recent entry)
   */
  async getLatest(userId: string): Promise<DynamoDBBodyMetric | null> {
    try {
      const result = await dynamoDb.send(
        new QueryCommand({
          TableName: BODY_METRICS_TABLE,
          KeyConditionExpression: "userId = :userId",
          ExpressionAttributeValues: {
            ":userId": userId,
          },
          ScanIndexForward: false,
          Limit: 1,
        })
      );

      return (result.Items?.[0] as DynamoDBBodyMetric) || null;
    } catch (error) {
      console.error("Error getting latest body metric:", error);
      return null;
    }
  },
};

// Export DynamoDB client for custom queries
export { dynamoDb, USERS_TABLE, WORKOUTS_TABLE, BODY_METRICS_TABLE };
