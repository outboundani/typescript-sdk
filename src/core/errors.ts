/** Base class for every error thrown by this SDK. */
export class OutboundIQError extends Error {
  /** HTTP status code, when the error came from an API response. */
  readonly status?: number;
  /** Parsed response body (JSON object or raw text), when one was received. */
  readonly body?: unknown;

  constructor(
    message: string,
    options: { status?: number; body?: unknown; cause?: unknown } = {},
  ) {
    super(
      message,
      options.cause !== undefined ? { cause: options.cause } : undefined,
    );
    this.name = new.target.name;
    this.status = options.status;
    this.body = options.body;
  }
}

/** 401 or 403: the API key is missing, invalid, inactive, or the wrong type. */
export class AuthenticationError extends OutboundIQError {}

/** 429: the request was rate limited. */
export class RateLimitError extends OutboundIQError {
  /** Seconds to wait before retrying, when the API sent a Retry-After header. */
  readonly retryAfter?: number;

  constructor(
    message: string,
    options: {
      status?: number;
      body?: unknown;
      cause?: unknown;
      retryAfter?: number;
    } = {},
  ) {
    super(message, options);
    this.retryAfter = options.retryAfter;
  }
}

/** Any other non-2xx API response. */
export class APIError extends OutboundIQError {}

/** The request never produced a response: network failure or timeout. */
export class ConnectionError extends OutboundIQError {}

/** A webhook signature did not match the payload. */
export class WebhookVerificationError extends OutboundIQError {}
