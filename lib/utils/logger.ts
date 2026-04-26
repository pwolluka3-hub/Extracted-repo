/**
 * Structured Logger Utility
 * Provides consistent logging across the application
 */

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

interface LogEntry {
  level: LogLevel;
  timestamp: string;
  message: string;
  data?: unknown;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
}

const SENSITIVE_KEY_PATTERN = /(token|secret|password|authorization|cookie|session|credential|api[-_]?key)/i;
const MAX_SANITIZE_DEPTH = 3;
const MAX_ARRAY_LENGTH = 20;

function sanitizeValue(value: unknown, depth = 0): unknown {
  if (value == null || typeof value === 'number' || typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'string') {
    return value.length > 500 ? `${value.slice(0, 500)}…` : value;
  }

  if (value instanceof Error) {
    return sanitizeError(value);
  }

  if (depth >= MAX_SANITIZE_DEPTH) {
    return '[Truncated]';
  }

  if (Array.isArray(value)) {
    const items = value.slice(0, MAX_ARRAY_LENGTH).map(item => sanitizeValue(item, depth + 1));
    if (value.length > MAX_ARRAY_LENGTH) {
      items.push(`[+${value.length - MAX_ARRAY_LENGTH} more items]`);
    }
    return items;
  }

  if (typeof value === 'object') {
    const sanitized: Record<string, unknown> = {};
    for (const [key, nestedValue] of Object.entries(value as Record<string, unknown>)) {
      sanitized[key] = SENSITIVE_KEY_PATTERN.test(key)
        ? '[REDACTED]'
        : sanitizeValue(nestedValue, depth + 1);
    }
    return sanitized;
  }

  return String(value);
}

function sanitizeError(error: Error) {
  return {
    name: error.name,
    message: error.message,
    stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
  };
}

class Logger {
  private minLevel: LogLevel;
  private isDevelopment: boolean;
  private logHistory: LogEntry[] = [];
  private maxHistorySize = 1000;

  constructor(minLevel: LogLevel = LogLevel.DEBUG) {
    this.minLevel = minLevel;
    this.isDevelopment = process.env.NODE_ENV === 'development';
  }

  private format(level: LogLevel, message: string): string {
    const levelName = LogLevel[level];
    const timestamp = new Date().toISOString();
    return `[${timestamp}] [${levelName}] ${message}`;
  }

  private log(level: LogLevel, message: string, data?: unknown, error?: Error): void {
    if (level < this.minLevel) return;

    const formatted = this.format(level, message);
    const sanitizedData = data === undefined ? undefined : sanitizeValue(data);
    const sanitizedError = error ? sanitizeError(error) : undefined;
    const entry: LogEntry = {
      level,
      timestamp: new Date().toISOString(),
      message,
      data: sanitizedData,
      error: sanitizedError,
    };

    // Add to history
    this.logHistory.push(entry);
    if (this.logHistory.length > this.maxHistorySize) {
      this.logHistory.shift();
    }

    // Console output
    const args = sanitizedData || sanitizedError
      ? [formatted, { data: sanitizedData, error: sanitizedError }]
      : [formatted];

    switch (level) {
      case LogLevel.DEBUG:
        if (this.isDevelopment) console.debug(...args);
        break;
      case LogLevel.INFO:
        console.info(...args);
        break;
      case LogLevel.WARN:
        console.warn(...args);
        break;
      case LogLevel.ERROR:
        console.error(...args);
        break;
    }

    // Send to error tracking in production
    if (level === LogLevel.ERROR && typeof window !== 'undefined' && (window as any).Sentry) {
      (window as any).Sentry.captureMessage(message, {
        level: 'error',
        extra: {
          hasData: sanitizedData !== undefined,
          data: sanitizedData,
          error: sanitizedError,
        },
      });
    }
  }

  debug(message: string, data?: unknown): void {
    this.log(LogLevel.DEBUG, message, data);
  }

  info(message: string, data?: unknown): void {
    this.log(LogLevel.INFO, message, data);
  }

  warn(message: string, data?: unknown): void {
    this.log(LogLevel.WARN, message, data);
  }

  error(message: string, error?: Error | unknown, data?: unknown): void {
    const err =
      error instanceof Error
        ? error
        : error === undefined
          ? new Error(message)
          : new Error(String(error));
    this.log(LogLevel.ERROR, message, data, err);
  }

  /**
   * Get recent log entries
   */
  getHistory(count: number = 50): LogEntry[] {
    return this.logHistory.slice(-count);
  }

  /**
   * Clear log history
   */
  clearHistory(): void {
    this.logHistory = [];
  }

  /**
   * Export logs for debugging
   */
  exportLogs(): string {
    return this.logHistory
      .map(entry => {
        let line = `${entry.timestamp} [${LogLevel[entry.level]}] ${entry.message}`;
        if (entry.data) line += ` | ${JSON.stringify(entry.data)}`;
        if (entry.error) line += ` | Error: ${entry.error.message}`;
        return line;
      })
      .join('\n');
  }
}

// Create singleton logger instance
export const logger = new Logger(
  process.env.NODE_ENV === 'production' ? LogLevel.INFO : LogLevel.DEBUG
);

// Export for convenience
export const log = {
  debug: (msg: string, data?: unknown) => logger.debug(msg, data),
  info: (msg: string, data?: unknown) => logger.info(msg, data),
  warn: (msg: string, data?: unknown) => logger.warn(msg, data),
  error: (msg: string, error?: Error | unknown, data?: unknown) => logger.error(msg, error, data),
};

/**
 * Timer utility for performance logging
 */
export class Timer {
  private start: number;
  private name: string;

  constructor(name: string) {
    this.name = name;
    this.start = performance.now();
  }

  end(): void {
    const duration = performance.now() - this.start;
    logger.info(`[PERF] ${this.name} took ${duration.toFixed(2)}ms`);
  }

  endError(error: Error): void {
    const duration = performance.now() - this.start;
    logger.error(
      `[PERF] ${this.name} failed after ${duration.toFixed(2)}ms`,
      error
    );
  }
}
