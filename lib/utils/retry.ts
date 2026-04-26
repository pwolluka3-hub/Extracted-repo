/**
 * Retry utility with exponential backoff
 * Used for resilient API calls and operations
 */

export interface RetryOptions {
  maxRetries?: number;
  initialDelayMs?: number;
  maxDelayMs?: number;
  backoffMultiplier?: number;
  onRetry?: (attempt: number, error: Error) => void;
  shouldRetry?: (error: Error) => boolean;
}

const DEFAULT_OPTIONS: Required<Omit<RetryOptions, 'onRetry' | 'shouldRetry'>> = {
  maxRetries: 3,
  initialDelayMs: 1000,
  maxDelayMs: 30000,
  backoffMultiplier: 2,
};

/**
 * Execute function with exponential backoff retry
 * @param fn - Function to execute
 * @param options - Retry options
 * @returns Result of function
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const config = { ...DEFAULT_OPTIONS, ...options };
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < config.maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // Check if we should retry this error
      if (config.shouldRetry && !config.shouldRetry(lastError)) {
        throw lastError;
      }

      if (attempt < config.maxRetries - 1) {
        const delayMs = Math.min(
          config.initialDelayMs * Math.pow(config.backoffMultiplier, attempt),
          config.maxDelayMs
        );

        config.onRetry?.(attempt + 1, lastError);

        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }
  }

  throw lastError || new Error('All retries failed');
}

/**
 * Wrapper for API calls with automatic retry
 */
export async function fetchWithRetry<T>(
  url: string,
  options: RequestInit = {},
  retryOptions: RetryOptions = {}
): Promise<T> {
  const callerShouldRetry = retryOptions.shouldRetry;

  return withRetry(
    async () => {
      const response = await fetch(url, options);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      return response.json() as Promise<T>;
    },
    {
      ...retryOptions,
      shouldRetry: (error) => {
        // Retry on network errors and server errors, not client errors
        const message = error.message;
        const defaultDecision = !message.includes('HTTP 4');
        return callerShouldRetry ? defaultDecision && callerShouldRetry(error) : defaultDecision;
      },
    }
  );
}
