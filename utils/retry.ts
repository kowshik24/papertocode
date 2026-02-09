/**
 * Retry utility with exponential backoff
 */

export interface RetryOptions {
  maxAttempts?: number;
  initialDelayMs?: number;
  maxDelayMs?: number;
  backoffMultiplier?: number;
  retryableErrors?: (error: unknown) => boolean;
  onRetry?: (attempt: number, error: unknown, delayMs: number) => void;
}

const DEFAULT_OPTIONS: Required<Omit<RetryOptions, 'onRetry' | 'retryableErrors'>> = {
  maxAttempts: 3,
  initialDelayMs: 1000,
  maxDelayMs: 10000,
  backoffMultiplier: 2,
};

/**
 * Check if an error is retryable (network errors, rate limits, server errors)
 */
export function isRetryableError(error: unknown): boolean {
  // Network errors
  if (error instanceof TypeError && error.message.includes('fetch')) {
    return true;
  }

  // Check for common retryable HTTP status codes
  if (error && typeof error === 'object') {
    const err = error as Record<string, unknown>;
    
    // Rate limit errors
    if (err.status === 429 || err.code === 'RATE_LIMIT_EXCEEDED') {
      return true;
    }
    
    // Server errors (5xx)
    if (typeof err.status === 'number' && err.status >= 500 && err.status < 600) {
      return true;
    }
    
    // Timeout errors
    if (err.code === 'ETIMEDOUT' || err.code === 'ECONNRESET' || err.name === 'AbortError') {
      return true;
    }

    // Check error message for common patterns
    const message = String(err.message || '').toLowerCase();
    if (
      message.includes('rate limit') ||
      message.includes('timeout') ||
      message.includes('network') ||
      message.includes('connection') ||
      message.includes('temporarily unavailable') ||
      message.includes('service unavailable') ||
      message.includes('too many requests')
    ) {
      return true;
    }
  }

  return false;
}

/**
 * Sleep for a given number of milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Calculate delay with jitter to prevent thundering herd
 */
function calculateDelay(
  attempt: number,
  initialDelayMs: number,
  maxDelayMs: number,
  multiplier: number
): number {
  const exponentialDelay = initialDelayMs * Math.pow(multiplier, attempt - 1);
  const cappedDelay = Math.min(exponentialDelay, maxDelayMs);
  // Add jitter: ±25%
  const jitter = cappedDelay * 0.25 * (Math.random() * 2 - 1);
  return Math.round(cappedDelay + jitter);
}

/**
 * Execute a function with retry logic and exponential backoff
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const {
    maxAttempts = DEFAULT_OPTIONS.maxAttempts,
    initialDelayMs = DEFAULT_OPTIONS.initialDelayMs,
    maxDelayMs = DEFAULT_OPTIONS.maxDelayMs,
    backoffMultiplier = DEFAULT_OPTIONS.backoffMultiplier,
    retryableErrors = isRetryableError,
    onRetry,
  } = options;

  let lastError: unknown;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      // Don't retry if this is the last attempt or if the error isn't retryable
      if (attempt === maxAttempts || !retryableErrors(error)) {
        throw error;
      }

      const delayMs = calculateDelay(attempt, initialDelayMs, maxDelayMs, backoffMultiplier);
      
      if (onRetry) {
        onRetry(attempt, error, delayMs);
      }

      await sleep(delayMs);
    }
  }

  // This should never be reached, but TypeScript needs it
  throw lastError;
}

/**
 * Create a retryable version of an async function
 */
export function makeRetryable<T extends unknown[], R>(
  fn: (...args: T) => Promise<R>,
  options: RetryOptions = {}
): (...args: T) => Promise<R> {
  return (...args: T) => withRetry(() => fn(...args), options);
}

/**
 * Error class for retry-specific errors
 */
export class RetryError extends Error {
  public readonly attempts: number;
  public readonly lastError: unknown;

  constructor(message: string, attempts: number, lastError: unknown) {
    super(message);
    this.name = 'RetryError';
    this.attempts = attempts;
    this.lastError = lastError;
  }
}
