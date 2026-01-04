/**
 * Application metrics tracking for Spotter
 *
 * Provides utilities for tracking performance metrics, usage stats,
 * and error rates. Can be integrated with CloudWatch or other monitoring tools.
 */

import { logger } from "./logger";
import {
  CloudWatchClient,
  PutMetricDataCommand,
  StandardUnit,
} from "@aws-sdk/client-cloudwatch";

export interface Metric {
  name: string;
  value: number;
  unit: "count" | "milliseconds" | "bytes" | "percent";
  timestamp: string;
  dimensions?: Record<string, string>;
}

/**
 * Convert our metric unit to CloudWatch StandardUnit
 */
function toCloudWatchUnit(unit: Metric["unit"]): StandardUnit {
  switch (unit) {
    case "count":
      return StandardUnit.Count;
    case "milliseconds":
      return StandardUnit.Milliseconds;
    case "bytes":
      return StandardUnit.Bytes;
    case "percent":
      return StandardUnit.Percent;
  }
}

/**
 * Get CloudWatch client (lazy initialization)
 */
let cloudWatchClient: CloudWatchClient | null = null;

function getCloudWatchClient(): CloudWatchClient {
  if (!cloudWatchClient) {
    cloudWatchClient = new CloudWatchClient({
      region: process.env.AWS_REGION || "us-east-1",
    });
  }
  return cloudWatchClient;
}

class MetricsCollector {
  private metrics: Metric[] = [];
  private flushInterval: NodeJS.Timeout | null = null;

  constructor() {
    // Auto-flush metrics every 60 seconds in production
    if (process.env.NODE_ENV === "production") {
      this.flushInterval = setInterval(() => this.flush(), 60000);
    }
  }

  /**
   * Record a metric
   */
  record(
    name: string,
    value: number,
    unit: "count" | "milliseconds" | "bytes" | "percent" = "count",
    dimensions?: Record<string, string>
  ) {
    const metric: Metric = {
      name,
      value,
      unit,
      timestamp: new Date().toISOString(),
      dimensions,
    };

    this.metrics.push(metric);

    // Log metric in development
    if (process.env.NODE_ENV === "development") {
      logger.debug(`Metric: ${name}=${value} ${unit}`, dimensions);
    }
  }

  /**
   * Increment a counter metric
   */
  increment(name: string, dimensions?: Record<string, string>) {
    this.record(name, 1, "count", dimensions);
  }

  /**
   * Time a function execution
   */
  async time<T>(
    metricName: string,
    fn: () => Promise<T>,
    dimensions?: Record<string, string>
  ): Promise<T> {
    const start = Date.now();
    try {
      const result = await fn();
      const duration = Date.now() - start;
      this.record(metricName, duration, "milliseconds", dimensions);
      return result;
    } catch (error) {
      const duration = Date.now() - start;
      this.record(metricName, duration, "milliseconds", {
        ...dimensions,
        error: "true",
      });
      throw error;
    }
  }

  /**
   * Flush metrics to logging/monitoring system
   */
  async flush() {
    if (this.metrics.length === 0) return;

    // In production, send to CloudWatch
    if (process.env.NODE_ENV === "production") {
      try {
        const cloudwatch = getCloudWatchClient();
        const namespace = process.env.CLOUDWATCH_NAMESPACE || "SpotBuddy";

        // CloudWatch has a limit of 1000 metrics per request
        // Split into batches of 20 for safety (recommended batch size)
        const batchSize = 20;
        for (let i = 0; i < this.metrics.length; i += batchSize) {
          const batch = this.metrics.slice(i, i + batchSize);

          const metricData = batch.map((metric) => ({
            MetricName: metric.name,
            Value: metric.value,
            Unit: toCloudWatchUnit(metric.unit),
            Timestamp: new Date(metric.timestamp),
            Dimensions: metric.dimensions
              ? Object.entries(metric.dimensions).map(([name, value]) => ({
                  Name: name,
                  Value: value,
                }))
              : undefined,
          }));

          await cloudwatch.send(
            new PutMetricDataCommand({
              Namespace: namespace,
              MetricData: metricData,
            })
          );
        }

        logger.info(`Sent ${this.metrics.length} metrics to CloudWatch`, {
          namespace,
        });
      } catch (error) {
        logger.error(
          "Failed to send metrics to CloudWatch",
          error instanceof Error ? error : new Error(String(error))
        );
        // Log metrics locally as fallback
        logger.info("Metrics (CloudWatch failed)", {
          count: this.metrics.length,
          metrics: this.metrics,
        });
      }
    } else {
      // In development, just log
      logger.debug("Metrics flush", {
        count: this.metrics.length,
        metrics: this.metrics,
      });
    }

    this.metrics = [];
  }

  /**
   * Cleanup
   */
  destroy() {
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
    }
    this.flush();
  }
}

// Singleton instance
export const metrics = new MetricsCollector();

/**
 * Common application metrics
 */
export const AppMetrics = {
  // API metrics
  apiRequest: (method: string, path: string, status: number) => {
    metrics.increment("api.request", { method, path, status: status.toString() });
  },

  apiError: (method: string, path: string, errorType: string) => {
    metrics.increment("api.error", { method, path, errorType });
  },

  // Workout metrics
  workoutCreated: (userId: string, source: string) => {
    metrics.increment("workout.created", { userId, source });
  },

  workoutViewed: (userId: string) => {
    metrics.increment("workout.viewed", { userId });
  },

  workoutDeleted: (userId: string) => {
    metrics.increment("workout.deleted", { userId });
  },

  // OCR metrics
  ocrProcessed: (userId: string, success: boolean) => {
    metrics.increment("ocr.processed", { userId, success: success.toString() });
  },

  ocrQuotaExceeded: (userId: string, tier: string) => {
    metrics.increment("ocr.quota_exceeded", { userId, tier });
  },

  // Database metrics
  dynamodbQuery: (table: string, duration: number) => {
    metrics.record("dynamodb.query.duration", duration, "milliseconds", { table });
  },

  dynamodbWrite: (table: string, duration: number) => {
    metrics.record("dynamodb.write.duration", duration, "milliseconds", { table });
  },

  // S3 metrics
  s3Upload: (bucket: string, size: number, duration: number) => {
    metrics.record("s3.upload.size", size, "bytes", { bucket });
    metrics.record("s3.upload.duration", duration, "milliseconds", { bucket });
  },

  // User metrics
  userLogin: (userId: string, provider: string) => {
    metrics.increment("user.login", { userId, provider });
  },

  userLogout: (userId: string) => {
    metrics.increment("user.logout", { userId });
  },

  userSignup: (userId: string, provider: string) => {
    metrics.increment("user.signup", { userId, provider });
  },

  // Subscription & Conversion metrics
  subscriptionCheckoutStarted: (userId: string, tier: string, billingPeriod: string) => {
    metrics.increment("subscription.checkout_started", { userId, tier, billingPeriod });
  },

  subscriptionCheckoutCompleted: (userId: string, tier: string, billingPeriod: string, priceAmount: number) => {
    metrics.increment("subscription.checkout_completed", { userId, tier, billingPeriod });
    metrics.record("subscription.revenue", priceAmount, "count", { tier, billingPeriod });
  },

  subscriptionCanceled: (userId: string, tier: string, reason?: string) => {
    metrics.increment("subscription.canceled", { userId, tier, reason: reason || "unknown" });
  },

  subscriptionUpgraded: (userId: string, fromTier: string, toTier: string) => {
    metrics.increment("subscription.upgraded", { userId, fromTier, toTier });
  },

  subscriptionDowngraded: (userId: string, fromTier: string, toTier: string) => {
    metrics.increment("subscription.downgraded", { userId, fromTier, toTier });
  },

  subscriptionRenewed: (userId: string, tier: string, billingPeriod: string) => {
    metrics.increment("subscription.renewed", { userId, tier, billingPeriod });
  },

  // Feature usage metrics (for conversion analysis)
  instagramImportUsed: (userId: string, tier: string, success: boolean) => {
    metrics.increment("feature.instagram_import", { userId, tier, success: success.toString() });
  },

  aiRequestUsed: (userId: string, tier: string, requestType: "generation" | "enhancement") => {
    metrics.increment("feature.ai_request", { userId, tier, requestType });
  },

  quotaLimitReached: (userId: string, tier: string, quotaType: string) => {
    metrics.increment("quota.limit_reached", { userId, tier, quotaType });
  },

  // Retention metrics (called on user activity)
  userRetentionActivity: (userId: string, tier: string, daysActive: number) => {
    metrics.increment("retention.activity", { userId, tier, daysActive: daysActive.toString() });
  },

  // Error metrics
  error: (errorType: string, component: string) => {
    metrics.increment("error", { errorType, component });
  },
};

/**
 * Performance monitor for tracking slow operations
 */
export class PerformanceMonitor {
  private name: string;
  private startTime: number;
  private dimensions?: Record<string, string>;

  constructor(name: string, dimensions?: Record<string, string>) {
    this.name = name;
    this.dimensions = dimensions;
    this.startTime = Date.now();
  }

  finish() {
    const duration = Date.now() - this.startTime;
    metrics.record(this.name, duration, "milliseconds", this.dimensions);

    // Warn on slow operations (>1s)
    if (duration > 1000) {
      logger.warn(`Slow operation: ${this.name} took ${duration}ms`, this.dimensions);
    }

    return duration;
  }
}
