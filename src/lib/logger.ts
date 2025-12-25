/**
 * Structured logging utility for Spotter
 *
 * Provides consistent logging format with levels, metadata, and timestamps
 * for both client and server-side code.
 */

export type LogLevel = "debug" | "info" | "warn" | "error";

export interface LogMetadata {
  [key: string]: any;
}

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  metadata?: LogMetadata;
  userId?: string;
  requestId?: string;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
}

class Logger {
  private isDevelopment = process.env.NODE_ENV === "development";
  private minLevel: LogLevel = (process.env.LOG_LEVEL as LogLevel) || "info";

  private levelPriority: Record<LogLevel, number> = {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3,
  };

  private shouldLog(level: LogLevel): boolean {
    return this.levelPriority[level] >= this.levelPriority[this.minLevel];
  }

  private formatEntry(entry: LogEntry): string {
    if (this.isDevelopment) {
      // Pretty print for development
      const prefix = `[${entry.level.toUpperCase()}] ${entry.timestamp}`;
      const parts = [prefix, entry.message];

      if (entry.userId) parts.push(`userId=${entry.userId}`);
      if (entry.requestId) parts.push(`requestId=${entry.requestId}`);
      if (entry.metadata) {
        parts.push(JSON.stringify(entry.metadata, null, 2));
      }
      if (entry.error) {
        parts.push(`\nError: ${entry.error.name}: ${entry.error.message}`);
        if (entry.error.stack) parts.push(entry.error.stack);
      }

      return parts.join(" ");
    } else {
      // JSON format for production (CloudWatch friendly)
      return JSON.stringify(entry);
    }
  }

  private createEntry(
    level: LogLevel,
    message: string,
    metadata?: LogMetadata,
    error?: Error
  ): LogEntry {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
    };

    if (metadata) {
      entry.metadata = metadata;
      // Extract userId and requestId if present
      if (metadata.userId) entry.userId = metadata.userId;
      if (metadata.requestId) entry.requestId = metadata.requestId;
    }

    if (error) {
      entry.error = {
        name: error.name,
        message: error.message,
        stack: error.stack,
      };
    }

    return entry;
  }

  debug(message: string, metadata?: LogMetadata) {
    if (!this.shouldLog("debug")) return;
    const entry = this.createEntry("debug", message, metadata);
    console.debug(this.formatEntry(entry));
  }

  info(message: string, metadata?: LogMetadata) {
    if (!this.shouldLog("info")) return;
    const entry = this.createEntry("info", message, metadata);
    console.info(this.formatEntry(entry));
  }

  warn(message: string, metadata?: LogMetadata) {
    if (!this.shouldLog("warn")) return;
    const entry = this.createEntry("warn", message, metadata);
    console.warn(this.formatEntry(entry));
  }

  error(message: string, error?: Error, metadata?: LogMetadata) {
    if (!this.shouldLog("error")) return;
    const entry = this.createEntry("error", message, metadata, error);
    console.error(this.formatEntry(entry));
  }

  // Convenience method for API request/response logging
  apiLog(
    method: string,
    path: string,
    status: number,
    duration: number,
    metadata?: LogMetadata
  ) {
    this.info(`${method} ${path} ${status} ${duration}ms`, {
      ...metadata,
      method,
      path,
      status,
      duration,
    });
  }

  // Convenience method for database operation logging
  dbLog(operation: string, table: string, duration: number, metadata?: LogMetadata) {
    this.debug(`DB ${operation} ${table} ${duration}ms`, {
      ...metadata,
      operation,
      table,
      duration,
    });
  }
}

// Export singleton instance
export const logger = new Logger();

// Express/Next.js middleware helper
export function createRequestLogger(req: Request) {
  const requestId = crypto.randomUUID();
  const startTime = Date.now();

  return {
    requestId,
    log: (message: string, metadata?: LogMetadata) => {
      logger.info(message, {
        ...metadata,
        requestId,
        method: req.method,
        url: new URL(req.url).pathname,
      });
    },
    error: (message: string, error?: Error, metadata?: LogMetadata) => {
      logger.error(message, error, {
        ...metadata,
        requestId,
        method: req.method,
        url: new URL(req.url).pathname,
      });
    },
    finish: (status: number) => {
      const duration = Date.now() - startTime;
      logger.apiLog(
        req.method || "UNKNOWN",
        new URL(req.url).pathname,
        status,
        duration,
        { requestId }
      );
    },
  };
}
