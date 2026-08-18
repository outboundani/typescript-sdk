import { VERSION } from "../version";
import {
  APIError,
  AuthenticationError,
  ConnectionError,
  OutboundIQError,
  RateLimitError,
} from "./errors";

const DEFAULT_BASE_URL = "https://api.outboundiq.cloud";

/** Configuration for the outboundIQ client. */
export interface OutboundIQConfig {
  /**
   * Universal API key, generated in the outboundIQ workspace dashboard.
   * Falls back to the OUTBOUNDIQ_API_KEY environment variable in Node.
   */
  apiKey?: string;
  /** Override the API base URL. Defaults to https://api.outboundiq.cloud */
  baseUrl?: string;
  /** Per-request timeout in milliseconds. Defaults to 30000. */
  timeoutMs?: number;
  /**
   * Maximum number of retries after a retryable failure. Defaults to 2.
   * GET requests retry on network errors, 429, and 5xx responses.
   * Mutating requests (POST, PUT, DELETE) retry only on 429, where the
   * request is known not to have been processed.
   */
  maxRetries?: number;
  /** Custom fetch implementation, mainly for tests and unusual runtimes. */
  fetch?: typeof globalThis.fetch;
  /** @internal Base delay in ms for retry backoff. Exposed for tests. */
  retryBaseDelayMs?: number;
}

export type QueryParams = Record<
  string,
  string | number | boolean | undefined
>;

export interface RequestOptions {
  method: "GET" | "POST" | "PUT" | "DELETE";
  path: string;
  query?: QueryParams;
  body?: unknown;
}

export class HttpClient {
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly timeoutMs: number;
  private readonly maxRetries: number;
  private readonly retryBaseDelayMs: number;
  private readonly fetchFn: typeof globalThis.fetch;

  constructor(config: OutboundIQConfig = {}) {
    const apiKey = config.apiKey ?? readEnv("OUTBOUNDIQ_API_KEY");
    if (!apiKey) {
      throw new OutboundIQError(
        "An API key is required. Pass { apiKey } when creating the client or set the OUTBOUNDIQ_API_KEY environment variable. Universal keys are generated in the outboundIQ workspace dashboard.",
      );
    }
    this.apiKey = apiKey;
    this.baseUrl = (config.baseUrl ?? DEFAULT_BASE_URL).replace(/\/+$/, "");
    this.timeoutMs = config.timeoutMs ?? 30_000;
    this.maxRetries = config.maxRetries ?? 2;
    this.retryBaseDelayMs = config.retryBaseDelayMs ?? 500;
    const fetchFn = config.fetch ?? globalThis.fetch;
    if (!fetchFn) {
      throw new OutboundIQError(
        "No fetch implementation available. Use Node 20 or newer, or pass { fetch } in the client config.",
      );
    }
    this.fetchFn = fetchFn;
  }

  async request<T>(options: RequestOptions): Promise<T> {
    const url = this.buildUrl(options.path, options.query);
    const retryUnsafe = options.method === "GET";

    for (let attempt = 0; ; attempt++) {
      let response: Response;
      try {
        response = await this.send(url, options);
      } catch (error) {
        if (retryUnsafe && attempt < this.maxRetries) {
          await sleep(this.backoffMs(attempt));
          continue;
        }
        throw this.toConnectionError(error, url);
      }

      if (response.ok) {
        return (await parseBody(response)) as T;
      }

      const body = await parseBody(response);

      if (response.status === 429) {
        const retryAfter = parseRetryAfter(response.headers.get("retry-after"));
        if (attempt < this.maxRetries) {
          await sleep(
            retryAfter !== undefined ? retryAfter * 1000 : this.backoffMs(attempt),
          );
          continue;
        }
        throw new RateLimitError(
          `${options.method} ${options.path} was rate limited (429)`,
          { status: 429, body, retryAfter },
        );
      }

      if (response.status >= 500 && retryUnsafe && attempt < this.maxRetries) {
        await sleep(this.backoffMs(attempt));
        continue;
      }

      throw toApiError(response.status, body, options);
    }
  }

  private async send(url: string, options: RequestOptions): Promise<Response> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      const headers: Record<string, string> = {
        Authorization: `Bearer ${this.apiKey}`,
        Accept: "application/json",
        "User-Agent": `outboundiq-client/${VERSION}`,
      };
      const init: RequestInit = {
        method: options.method,
        headers,
        signal: controller.signal,
      };
      if (options.body !== undefined) {
        headers["Content-Type"] = "application/json";
        init.body = JSON.stringify(options.body);
      }
      return await this.fetchFn(url, init);
    } finally {
      clearTimeout(timer);
    }
  }

  private buildUrl(path: string, query?: QueryParams): string {
    const url = new URL(this.baseUrl + path);
    if (query) {
      for (const [key, value] of Object.entries(query)) {
        if (value !== undefined) {
          url.searchParams.set(key, String(value));
        }
      }
    }
    return url.toString();
  }

  private backoffMs(attempt: number): number {
    const base = Math.min(this.retryBaseDelayMs * 2 ** attempt, 8_000);
    return base + Math.random() * (this.retryBaseDelayMs / 2);
  }

  private toConnectionError(error: unknown, url: string): ConnectionError {
    const name = error instanceof Error ? error.name : "";
    if (name === "AbortError" || name === "TimeoutError") {
      return new ConnectionError(
        `Request to ${url} timed out after ${this.timeoutMs}ms`,
        { cause: error },
      );
    }
    return new ConnectionError(`Network error while calling ${url}`, {
      cause: error,
    });
  }
}

async function parseBody(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) return undefined;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function toApiError(
  status: number,
  body: unknown,
  options: RequestOptions,
): OutboundIQError {
  const detail = extractMessage(body);
  const summary = `${options.method} ${options.path} failed with status ${status}${detail ? `: ${detail}` : ""}`;
  if (status === 401 || status === 403) {
    return new AuthenticationError(
      `${summary}. Check that the API key is valid, active, and of type universal.`,
      { status, body },
    );
  }
  return new APIError(summary, { status, body });
}

function extractMessage(body: unknown): string | undefined {
  if (
    body !== null &&
    typeof body === "object" &&
    "message" in body &&
    typeof (body as { message: unknown }).message === "string"
  ) {
    return (body as { message: string }).message;
  }
  return undefined;
}

function parseRetryAfter(header: string | null): number | undefined {
  if (!header) return undefined;
  const seconds = Number(header);
  return Number.isFinite(seconds) && seconds >= 0 ? seconds : undefined;
}

function readEnv(name: string): string | undefined {
  const env = (
    globalThis as {
      process?: { env?: Record<string, string | undefined> };
    }
  ).process?.env;
  return env?.[name];
}

function sleep(ms: number): Promise<void> {
  if (ms <= 0) return Promise.resolve();
  return new Promise((resolve) => setTimeout(resolve, ms));
}
