import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  UpdateCommand,
  QueryCommand,
  DeleteCommand,
} from "@aws-sdk/lib-dynamodb";
import type { TrainingProfile } from "./training-profile";

// Lazy-initialized DynamoDB client singleton
let dynamoDbInstance: DynamoDBDocumentClient | null = null;

/**
 * Get the DynamoDB Document client instance (lazy initialization)
 * Only initializes when first called, not at module load time
 */
function getDynamoDb(): DynamoDBDocumentClient {
  if (!dynamoDbInstance) {
    const client = new DynamoDBClient({
      region: process.env.AWS_REGION || "us-east-1",
    });
    dynamoDbInstance = DynamoDBDocumentClient.from(client);
  }
  return dynamoDbInstance;
}

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

  // AI Features (Phase 6)
  aiRequestsUsed?: number;
  aiRequestsLimit?: number;
  lastAiRequestReset?: string | null;

  // Training Profile (Phase 6) - Full profile from training-profile.ts
  trainingProfile?: TrainingProfile;

  // Experience level (quick access, also in trainingProfile)
  experience?: 'beginner' | 'intermediate' | 'advanced';
}

// User operations
export const dynamoDBUsers = {
  /**
   * Get user by ID
   */
  async get(userId: string): Promise<DynamoDBUser | null> {
    try {
      const result = await getDynamoDb().send(
        new GetCommand({
          TableName: USERS_TABLE,
          Key: { id: userId },
          // Use strongly consistent reads so auth/session reflects webhook updates immediately
          ConsistentRead: true,
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
      const result = await getDynamoDb().send(
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
   * Get user by Stripe customer ID
   */
  async getByStripeCustomerId(stripeCustomerId: string): Promise<DynamoDBUser | null> {
    try {
      const result = await getDynamoDb().send(
        new QueryCommand({
          TableName: USERS_TABLE,
          IndexName: "stripeCustomerId-index", // Assumes GSI on stripeCustomerId field
          KeyConditionExpression: "stripeCustomerId = :customerId",
          ExpressionAttributeValues: {
            ":customerId": stripeCustomerId,
          },
        })
      );

      return (result.Items?.[0] as DynamoDBUser) || null;
    } catch (error) {
      console.error("Error querying user by stripeCustomerId from DynamoDB:", error);
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

      // AI quota defaults (Phase 6)
      aiRequestsUsed: user.aiRequestsUsed || 0,
      aiRequestsLimit: user.aiRequestsLimit || 0, // Free tier: 0 AI requests
      lastAiRequestReset: user.lastAiRequestReset || now,

      // Training profile (Phase 6)
      trainingProfile: user.trainingProfile || undefined,
    };

    try {
      await getDynamoDb().send(
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
      tier?: "free" | "starter" | "pro" | "elite";
      status?: "active" | "inactive" | "trialing" | "canceled" | "past_due";
      stripeCustomerId?: string | null;
      stripeSubscriptionId?: string | null;
      startDate?: Date | null;
      endDate?: Date | null;
      trialEndsAt?: Date | null;
    }
  ): Promise<void> {
    const updateParts: string[] = [];
    const attributeValues: Record<string, unknown> = {
      ":updatedAt": new Date().toISOString(),
    };

    const hasProp = <K extends keyof typeof subscription>(key: K): boolean =>
      Object.prototype.hasOwnProperty.call(subscription, key);

    if (hasProp("tier")) {
      updateParts.push("subscriptionTier = :tier");
      attributeValues[":tier"] = subscription.tier ?? null;
    }

    if (hasProp("status")) {
      updateParts.push("subscriptionStatus = :status");
      attributeValues[":status"] = subscription.status ?? null;
    }

    if (hasProp("stripeCustomerId")) {
      updateParts.push("stripeCustomerId = :customerId");
      attributeValues[":customerId"] = subscription.stripeCustomerId ?? null;
    }

    if (hasProp("stripeSubscriptionId")) {
      updateParts.push("stripeSubscriptionId = :subscriptionId");
      attributeValues[":subscriptionId"] = subscription.stripeSubscriptionId ?? null;
    }

    if (hasProp("startDate")) {
      updateParts.push("subscriptionStartDate = :startDate");
      attributeValues[":startDate"] = subscription.startDate
        ? subscription.startDate.toISOString()
        : null;
    }

    if (hasProp("endDate")) {
      updateParts.push("subscriptionEndDate = :endDate");
      attributeValues[":endDate"] = subscription.endDate
        ? subscription.endDate.toISOString()
        : null;
    }

    if (hasProp("trialEndsAt")) {
      updateParts.push("trialEndsAt = :trialEndsAt");
      attributeValues[":trialEndsAt"] = subscription.trialEndsAt
        ? subscription.trialEndsAt.toISOString()
        : null;
    }

    // Always update updatedAt
    updateParts.push("updatedAt = :updatedAt");

    // If nothing besides updatedAt was provided, skip the call
    if (updateParts.length === 1) {
      return;
    }

    try {
      await getDynamoDb().send(
        new UpdateCommand({
          TableName: USERS_TABLE,
          Key: { id: userId },
          UpdateExpression: `SET ${updateParts.join(", ")}`,
          ExpressionAttributeValues: attributeValues,
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
      await getDynamoDb().send(
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
      await getDynamoDb().send(
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
   * Increment AI request usage counter (Phase 6)
   */
  async incrementAIUsage(userId: string): Promise<void> {
    try {
      await getDynamoDb().send(
        new UpdateCommand({
          TableName: USERS_TABLE,
          Key: { id: userId },
          UpdateExpression: "SET aiRequestsUsed = if_not_exists(aiRequestsUsed, :zero) + :inc, updatedAt = :updatedAt",
          ExpressionAttributeValues: {
            ":inc": 1,
            ":zero": 0,
            ":updatedAt": new Date().toISOString(),
          },
        })
      );
    } catch (error) {
      console.error("Error incrementing AI usage in DynamoDB:", error);
      throw error;
    }
  },

  /**
   * Reset AI quota (monthly reset - Phase 6)
   */
  async resetAIQuota(userId: string): Promise<void> {
    try {
      const now = new Date().toISOString();
      await getDynamoDb().send(
        new UpdateCommand({
          TableName: USERS_TABLE,
          Key: { id: userId },
          UpdateExpression:
            "SET aiRequestsUsed = :zero, lastAiRequestReset = :resetDate, updatedAt = :updatedAt",
          ExpressionAttributeValues: {
            ":zero": 0,
            ":resetDate": now,
            ":updatedAt": now,
          },
        })
      );
    } catch (error) {
      console.error("Error resetting AI quota in DynamoDB:", error);
      throw error;
    }
  },

  /**
   * Update training profile (Phase 6)
   */
  async updateTrainingProfile(
    userId: string,
    profile: DynamoDBUser["trainingProfile"]
  ): Promise<void> {
    try {
      await getDynamoDb().send(
        new UpdateCommand({
          TableName: USERS_TABLE,
          Key: { id: userId },
          UpdateExpression: "SET trainingProfile = :profile, updatedAt = :updatedAt",
          ExpressionAttributeValues: {
            ":profile": profile || {},
            ":updatedAt": new Date().toISOString(),
          },
        })
      );
    } catch (error) {
      console.error("Error updating training profile in DynamoDB:", error);
      throw error;
    }
  },

  /**
   * Update user profile fields
   */
  async update(
    userId: string,
    updates: {
      firstName?: string | null;
      lastName?: string | null;
      trainingProfile?: DynamoDBUser["trainingProfile"];
    }
  ): Promise<void> {
    const updateParts: string[] = [];
    const attributeValues: Record<string, unknown> = {
      ":updatedAt": new Date().toISOString(),
    };

    const hasProp = <K extends keyof typeof updates>(key: K): boolean =>
      Object.prototype.hasOwnProperty.call(updates, key);

    if (hasProp("firstName")) {
      updateParts.push("firstName = :firstName");
      attributeValues[":firstName"] = updates.firstName ?? null;
    }

    if (hasProp("lastName")) {
      updateParts.push("lastName = :lastName");
      attributeValues[":lastName"] = updates.lastName ?? null;
    }

    if (hasProp("trainingProfile")) {
      updateParts.push("trainingProfile = :trainingProfile");
      attributeValues[":trainingProfile"] = updates.trainingProfile ?? {};
    }

    // Always update updatedAt
    updateParts.push("updatedAt = :updatedAt");

    // If nothing besides updatedAt was provided, skip the call
    if (updateParts.length === 1) {
      return;
    }

    try {
      await getDynamoDb().send(
        new UpdateCommand({
          TableName: USERS_TABLE,
          Key: { id: userId },
          UpdateExpression: `SET ${updateParts.join(", ")}`,
          ExpressionAttributeValues: attributeValues,
        })
      );
    } catch (error) {
      console.error("Error updating user in DynamoDB:", error);
      throw error;
    }
  },

  /**
   * Generic quota counter increment
   *
   * Increments any numeric field in the user table by a given amount.
   * Automatically initializes the field to 0 if it doesn't exist.
   *
   * @param userId - User ID
   * @param field - Field name to increment (e.g., 'ocrQuotaUsed', 'workoutsSaved')
   * @param amount - Amount to increment by (default: 1)
   *
   * @example
   * ```typescript
   * // Increment OCR quota by 1
   * await dynamoDBUsers.incrementCounter(userId, 'ocrQuotaUsed');
   *
   * // Increment workouts saved by 1
   * await dynamoDBUsers.incrementCounter(userId, 'workoutsSaved');
   *
   * // Add 5 to AI requests
   * await dynamoDBUsers.incrementCounter(userId, 'aiRequestsUsed', 5);
   * ```
   */
  async incrementCounter(
    userId: string,
    field: keyof Pick<DynamoDBUser, 'ocrQuotaUsed' | 'workoutsSaved' | 'aiRequestsUsed'>,
    amount: number = 1
  ): Promise<void> {
    try {
      await getDynamoDb().send(
        new UpdateCommand({
          TableName: USERS_TABLE,
          Key: { id: userId },
          UpdateExpression: `SET #field = if_not_exists(#field, :zero) + :amount, updatedAt = :updatedAt`,
          ExpressionAttributeNames: {
            "#field": field,
          },
          ExpressionAttributeValues: {
            ":amount": amount,
            ":zero": 0,
            ":updatedAt": new Date().toISOString(),
          },
        })
      );
    } catch (error) {
      console.error(`Error incrementing ${field} in DynamoDB:`, error);
      throw error;
    }
  },

  /**
   * Generic quota counter decrement
   *
   * Decrements any numeric field in the user table by a given amount.
   * Will not go below 0.
   *
   * @param userId - User ID
   * @param field - Field name to decrement
   * @param amount - Amount to decrement by (default: 1)
   *
   * @example
   * ```typescript
   * // Refund OCR quota by 1
   * await dynamoDBUsers.decrementCounter(userId, 'ocrQuotaUsed');
   * ```
   */
  async decrementCounter(
    userId: string,
    field: keyof Pick<DynamoDBUser, 'ocrQuotaUsed' | 'workoutsSaved' | 'aiRequestsUsed'>,
    amount: number = 1
  ): Promise<void> {
    try {
      // Get current value first
      const user = await this.get(userId);
      if (!user) {
        throw new Error(`User ${userId} not found`);
      }

      const currentValue = (user[field] as number) || 0;
      const newValue = Math.max(0, currentValue - amount);

      await getDynamoDb().send(
        new UpdateCommand({
          TableName: USERS_TABLE,
          Key: { id: userId },
          UpdateExpression: `SET #field = :newValue, updatedAt = :updatedAt`,
          ExpressionAttributeNames: {
            "#field": field,
          },
          ExpressionAttributeValues: {
            ":newValue": newValue,
            ":updatedAt": new Date().toISOString(),
          },
        })
      );
    } catch (error) {
      console.error(`Error decrementing ${field} in DynamoDB:`, error);
      throw error;
    }
  },

  /**
   * Reset quota counter to zero
   *
   * @param userId - User ID
   * @param field - Field name to reset
   * @param resetDateField - Optional field to track reset date
   *
   * @example
   * ```typescript
   * // Reset OCR quota with reset date tracking
   * await dynamoDBUsers.resetCounter(userId, 'ocrQuotaUsed', 'ocrQuotaResetDate');
   *
   * // Reset AI requests
   * await dynamoDBUsers.resetCounter(userId, 'aiRequestsUsed', 'lastAiRequestReset');
   * ```
   */
  async resetCounter(
    userId: string,
    field: keyof Pick<DynamoDBUser, 'ocrQuotaUsed' | 'workoutsSaved' | 'aiRequestsUsed'>,
    resetDateField?: 'ocrQuotaResetDate' | 'lastAiRequestReset'
  ): Promise<void> {
    try {
      const now = new Date().toISOString();

      const updateExpression = resetDateField
        ? `SET #field = :zero, #resetDate = :now, updatedAt = :updatedAt`
        : `SET #field = :zero, updatedAt = :updatedAt`;

      const attributeNames: Record<string, string> = {
        "#field": field,
      };

      if (resetDateField) {
        attributeNames["#resetDate"] = resetDateField;
      }

      const attributeValues: Record<string, unknown> = {
        ":zero": 0,
        ":updatedAt": now,
      };

      if (resetDateField) {
        attributeValues[":now"] = now;
      }

      await getDynamoDb().send(
        new UpdateCommand({
          TableName: USERS_TABLE,
          Key: { id: userId },
          UpdateExpression: updateExpression,
          ExpressionAttributeNames: attributeNames,
          ExpressionAttributeValues: attributeValues,
        })
      );
    } catch (error) {
      console.error(`Error resetting ${field} in DynamoDB:`, error);
      throw error;
    }
  },

  /**
   * Delete user
   */
  async delete(userId: string): Promise<void> {
    try {
      await getDynamoDb().send(
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
  setDetails?: Array<{
    id?: string | null;
    reps?: string | number | null;
    weight?: string | number | null;
  }> | null;
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

  // Phase 2: Scheduling & Status
  scheduledDate?: string | null; // ISO date (YYYY-MM-DD) when workout is scheduled
  status?: 'scheduled' | 'completed' | 'skipped' | null; // Workout completion status
  completedDate?: string | null; // ISO date when workout was completed (may differ from scheduledDate)

  // Phase 6: AI Enhancement
  aiEnhanced?: boolean; // Whether workout was enhanced by AI
  aiNotes?: string[] | null; // AI-generated notes and recommendations (array of strings)
  muscleGroups?: string[]; // Muscle groups targeted (can be AI-generated)

  // Workout Structure Metadata
  workoutType?: 'standard' | 'emom' | 'amrap' | 'rounds' | 'ladder' | 'tabata'; // Type of workout structure
  structure?: {
    rounds?: number; // Number of rounds (EMOM, Rounds)
    timePerRound?: number; // Seconds per round (EMOM)
    timeLimit?: number; // Seconds total (AMRAP)
    totalTime?: number; // Total workout time in seconds
    pattern?: string; // Rep pattern for ladder workouts (e.g., "21-15-9")
  } | null;
}

// Workout operations
export const dynamoDBWorkouts = {
  /**
   * Get all workouts for a user
   */
  async list(userId: string, limit?: number): Promise<DynamoDBWorkout[]> {
    try {
      const result = await getDynamoDb().send(
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
      const result = await getDynamoDb().send(
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
      imageUrls: workout.imageUrls,
      thumbnailUrl: workout.thumbnailUrl,
      // Preserve scheduling fields if provided
      scheduledDate: workout.scheduledDate ?? null,
      status: workout.status ?? null,
      completedDate: workout.completedDate ?? null,
    };

    try {
      await getDynamoDb().send(
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
      scheduledDate?: string | null;
      status?: 'scheduled' | 'completed' | 'skipped' | null;
      completedDate?: string | null;
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
      if (updates.scheduledDate !== undefined) {
        updateExpressions.push("scheduledDate = :scheduledDate");
        attributeValues[":scheduledDate"] = updates.scheduledDate;
      }
      if (updates.status !== undefined) {
        updateExpressions.push("#status = :status");
        attributeValues[":status"] = updates.status;
        attributeNames["#status"] = "status"; // Reserved keyword
      }
      if (updates.completedDate !== undefined) {
        updateExpressions.push("completedDate = :completedDate");
        attributeValues[":completedDate"] = updates.completedDate;
      }

      await getDynamoDb().send(
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
      await getDynamoDb().send(
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
      const result = await getDynamoDb().send(
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
      const result = await getDynamoDb().send(
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

  /**
   * Get scheduled workouts for a specific date
   */
  async getScheduledForDate(
    userId: string,
    date: string
  ): Promise<DynamoDBWorkout[]> {
    try {
      const result = await getDynamoDb().send(
        new QueryCommand({
          TableName: WORKOUTS_TABLE,
          KeyConditionExpression: "userId = :userId",
          FilterExpression: "scheduledDate = :date",
          ExpressionAttributeValues: {
            ":userId": userId,
            ":date": date,
          },
        })
      );

      return (result.Items as DynamoDBWorkout[]) || [];
    } catch (error) {
      console.error("Error getting scheduled workouts:", error);
      return [];
    }
  },

  /**
   * Get all scheduled workouts (future and past)
   */
  async getScheduled(userId: string): Promise<DynamoDBWorkout[]> {
    try {
      const result = await getDynamoDb().send(
        new QueryCommand({
          TableName: WORKOUTS_TABLE,
          KeyConditionExpression: "userId = :userId",
          FilterExpression: "attribute_exists(scheduledDate)",
          ExpressionAttributeValues: {
            ":userId": userId,
          },
        })
      );

      return (result.Items as DynamoDBWorkout[]) || [];
    } catch (error) {
      console.error("Error getting scheduled workouts:", error);
      return [];
    }
  },

  /**
   * Schedule a workout for a specific date
   */
  async scheduleWorkout(
    userId: string,
    workoutId: string,
    scheduledDate: string,
    status: 'scheduled' | 'completed' | 'skipped' = 'scheduled'
  ): Promise<void> {
    try {
      await getDynamoDb().send(
        new UpdateCommand({
          TableName: WORKOUTS_TABLE,
          Key: { userId, workoutId },
          UpdateExpression:
            "SET scheduledDate = :scheduledDate, #status = :status, updatedAt = :updatedAt",
          ExpressionAttributeNames: {
            "#status": "status",
          },
          ExpressionAttributeValues: {
            ":scheduledDate": scheduledDate,
            ":status": status,
            ":updatedAt": new Date().toISOString(),
          },
        })
      );
    } catch (error) {
      console.error("Error scheduling workout:", error);
      throw error;
    }
  },

  /**
   * Mark workout as completed on a specific date
   */
  async completeWorkout(
    userId: string,
    workoutId: string,
    completedDate?: string
  ): Promise<void> {
    try {
      await getDynamoDb().send(
        new UpdateCommand({
          TableName: WORKOUTS_TABLE,
          Key: { userId, workoutId },
          UpdateExpression:
            "SET #status = :status, completedDate = :completedDate, updatedAt = :updatedAt",
          ExpressionAttributeNames: {
            "#status": "status",
          },
          ExpressionAttributeValues: {
            ":status": "completed",
            ":completedDate": completedDate || new Date().toISOString().split("T")[0],
            ":updatedAt": new Date().toISOString(),
          },
        })
      );
    } catch (error) {
      console.error("Error completing workout:", error);
      throw error;
    }
  },

  /**
   * Unschedule a workout (remove scheduling info)
   */
  async unscheduleWorkout(userId: string, workoutId: string): Promise<void> {
    try {
      await getDynamoDb().send(
        new UpdateCommand({
          TableName: WORKOUTS_TABLE,
          Key: { userId, workoutId },
          UpdateExpression:
            "REMOVE scheduledDate, #status, completedDate SET updatedAt = :updatedAt",
          ExpressionAttributeNames: {
            "#status": "status",
          },
          ExpressionAttributeValues: {
            ":updatedAt": new Date().toISOString(),
          },
        })
      );
    } catch (error) {
      console.error("Error unscheduling workout:", error);
      throw error;
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
      const result = await getDynamoDb().send(
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
      const result = await getDynamoDb().send(
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
      const result = await getDynamoDb().send(
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
      await getDynamoDb().send(
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
      await getDynamoDb().send(
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
      const result = await getDynamoDb().send(
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

// Export DynamoDB client getter for custom queries
export { getDynamoDb, USERS_TABLE, WORKOUTS_TABLE, BODY_METRICS_TABLE };
