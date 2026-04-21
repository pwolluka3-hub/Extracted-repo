'use client';

// Error types for better handling
export enum ErrorType {
  NETWORK = 'network',
  AUTH = 'auth',
  API = 'api',
  VALIDATION = 'validation',
  RATE_LIMIT = 'rate_limit',
  STORAGE = 'storage',
  UNKNOWN = 'unknown',
}

export interface AppError extends Error {
  type: ErrorType;
  code?: string;
  details?: Record<string, unknown>;
  retryable: boolean;
  userMessage: string;
}

// Create a standardized app error
export function createAppError(
  message: string,
  type: ErrorType = ErrorType.UNKNOWN,
  options: {
    code?: string;
    details?: Record<string, unknown>;
    retryable?: boolean;
    cause?: Error;
  } = {}
): AppError {
  const error = new Error(message) as AppError;
  error.type = type;
  error.code = options.code;
  error.details = options.details;
  error.retryable = options.retryable ?? false;
  error.userMessage = getUserFriendlyMessage(type, message);
  
  if (options.cause) {
    error.cause = options.cause;
  }
  
  return error;
}

// Get user-friendly error message
function getUserFriendlyMessage(type: ErrorType, originalMessage: string): string {
  switch (type) {
    case ErrorType.NETWORK:
      return 'Connection issue. Check your internet and try again.';
    case ErrorType.AUTH:
      return 'Authentication required. Please sign in again.';
    case ErrorType.RATE_LIMIT:
      return 'Too many requests. Please wait a moment and try again.';
    case ErrorType.STORAGE:
      return 'Storage error. Some data may not have saved.';
    case ErrorType.VALIDATION:
      return originalMessage || 'Invalid input. Please check your data.';
    case ErrorType.API:
      if (originalMessage.includes('key')) {
        return 'API key issue. Check your settings.';
      }
      return 'Service temporarily unavailable. Try again shortly.';
    default:
      return 'Something went wrong. Please try again.';
  }
}

// Parse error from various sources
export function parseError(error: unknown): AppError {
  // Already an AppError
  if (error && typeof error === 'object' && 'type' in error && 'userMessage' in error) {
    return error as AppError;
  }

  // Standard Error
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    
    // Detect error type from message
    if (message.includes('network') || message.includes('fetch') || message.includes('connection')) {
      return createAppError(error.message, ErrorType.NETWORK, { retryable: true, cause: error });
    }
    
    if (message.includes('401') || message.includes('unauthorized') || message.includes('auth')) {
      return createAppError(error.message, ErrorType.AUTH, { cause: error });
    }
    
    if (message.includes('429') || message.includes('rate') || message.includes('quota')) {
      return createAppError(error.message, ErrorType.RATE_LIMIT, { retryable: true, cause: error });
    }
    
    if (message.includes('api') || message.includes('key')) {
      return createAppError(error.message, ErrorType.API, { cause: error });
    }
    
    if (message.includes('storage') || message.includes('puter')) {
      return createAppError(error.message, ErrorType.STORAGE, { retryable: true, cause: error });
    }
    
    return createAppError(error.message, ErrorType.UNKNOWN, { cause: error });
  }

  // String error
  if (typeof error === 'string') {
    return createAppError(error);
  }

  // Unknown error type
  return createAppError('An unexpected error occurred');
}

// Execute with error handling and optional retry
export async function withErrorHandling<T>(
  fn: () => Promise<T>,
  options: {
    context?: string;
    retries?: number;
    retryDelay?: number;
    onError?: (error: AppError) => void;
  } = {}
): Promise<T> {
  const { context = 'operation', retries = 0, retryDelay = 1000, onError } = options;
  let lastError: AppError | null = null;
  
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = parseError(error);
      
      // Log error with context
      console.error(`[${context}] Attempt ${attempt + 1}/${retries + 1} failed:`, lastError.message);
      
      // Call error handler if provided
      if (onError) {
        onError(lastError);
      }
      
      // Only retry if error is retryable and we have retries left
      if (!lastError.retryable || attempt >= retries) {
        break;
      }
      
      // Wait before retry with exponential backoff
      const delay = retryDelay * Math.pow(1.5, attempt);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError;
}

// Safe JSON parse with fallback
export function safeJsonParse<T>(json: string, fallback: T): T {
  try {
    return JSON.parse(json) as T;
  } catch {
    return fallback;
  }
}

// Safe async operation with timeout
export async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  errorMessage = 'Operation timed out'
): Promise<T> {
  const timeout = new Promise<never>((_, reject) => {
    setTimeout(() => reject(createAppError(errorMessage, ErrorType.NETWORK, { retryable: true })), timeoutMs);
  });
  
  return Promise.race([promise, timeout]);
}

// Debounced error reporter to avoid spam
let errorReportQueue: AppError[] = [];
let reportTimeout: NodeJS.Timeout | null = null;

export function reportError(error: AppError | Error): void {
  const appError = error instanceof Error && !('type' in error) ? parseError(error) : error as AppError;
  errorReportQueue.push(appError);
  
  if (reportTimeout) {
    clearTimeout(reportTimeout);
  }
  
  reportTimeout = setTimeout(() => {
    // In production, would send to error tracking service
    console.group('[Error Report]');
    errorReportQueue.forEach(e => {
      console.error({
        type: e.type,
        message: e.message,
        userMessage: e.userMessage,
        retryable: e.retryable,
        code: e.code,
      });
    });
    console.groupEnd();
    errorReportQueue = [];
  }, 1000);
}

// Hook-friendly error state
export interface ErrorState {
  error: AppError | null;
  hasError: boolean;
  clearError: () => void;
  setError: (error: unknown) => void;
}

// Create error state for use with useState
export function createErrorState(): {
  error: AppError | null;
  setError: (error: unknown) => void;
  clearError: () => void;
} {
  let currentError: AppError | null = null;
  
  return {
    get error() { return currentError; },
    setError: (error: unknown) => {
      currentError = parseError(error);
      reportError(currentError);
    },
    clearError: () => { currentError = null; },
  };
}
