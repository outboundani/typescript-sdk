import { afterEach, describe, expect, it, vi } from "vitest";
import {
  APIError,
  AuthenticationError,
  ConnectionError,
  OutboundIQError,
  RateLimitError,
  outboundiq,
  type OutboundIQConfig,
} from "../src/index";
import { fetchStub, hangingFetch, jsonResponse, networkError } from "./helpers";

const KEY = "test-api-key";

function client(fetchFn: typeof fetch, extra: OutboundIQConfig = {}) {
  return outboundiq({
    apiKey: KEY,
    fetch: fetchFn,
    retryBaseDelayMs: 1,
    ...extra,
  });
}

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("auth and headers", () => {
  it("sends the Bearer token, accept, and user-agent headers", async () => {
    const { calls, fetchFn } = fetchStub(() => jsonResponse(200, { ok: true }));
    await client(fetchFn).nrm.listAnis();
    expect(calls[0]!.headers.Authorization).toBe(`Bearer ${KEY}`);
    expect(calls[0]!.headers.Accept).toBe("application/json");
    expect(calls[0]!.headers["User-Agent"]).toMatch(/^outboundiq-client\//);
    expect(calls[0]!.headers["Content-Type"]).toBeUndefined();
  });

  it("sets Content-Type only when a body is sent", async () => {
    const { calls, fetchFn } = fetchStub(() =>
      jsonResponse(200, { success: true, ani: "1", message: "ok" }),
    );
    await client(fetchFn).assignment.next({ prospect_phone: "5551234567" });
    expect(calls[0]!.headers["Content-Type"]).toBe("application/json");
  });

  it("throws a helpful error when no API key is provided", () => {
    vi.stubEnv("OUTBOUNDIQ_API_KEY", "");
    expect(() => outboundiq()).toThrow(OutboundIQError);
    expect(() => outboundiq()).toThrow(/OUTBOUNDIQ_API_KEY/);
  });

  it("falls back to the OUTBOUNDIQ_API_KEY environment variable", async () => {
    vi.stubEnv("OUTBOUNDIQ_API_KEY", "env-key");
    const { calls, fetchFn } = fetchStub(() => jsonResponse(200, {}));
    await outboundiq({ fetch: fetchFn }).nrm.listAnis();
    expect(calls[0]!.headers.Authorization).toBe("Bearer env-key");
  });
});

describe("error mapping", () => {
  it("maps 401 to AuthenticationError with status and body", async () => {
    const { fetchFn } = fetchStub(() =>
      jsonResponse(401, { message: "invalid key" }),
    );
    const error = await client(fetchFn)
      .nrm.listAnis()
      .catch((e: unknown) => e);
    expect(error).toBeInstanceOf(AuthenticationError);
    expect((error as AuthenticationError).status).toBe(401);
    expect((error as AuthenticationError).body).toEqual({
      message: "invalid key",
    });
  });

  it("maps other failures to APIError and surfaces the API message", async () => {
    const { fetchFn } = fetchStub(() =>
      jsonResponse(404, { message: "campaign not found" }),
    );
    const error = await client(fetchFn)
      .custom.campaigns.get("nope")
      .catch((e: unknown) => e);
    expect(error).toBeInstanceOf(APIError);
    expect((error as APIError).message).toContain("404");
    expect((error as APIError).message).toContain("campaign not found");
  });
});

describe("retries", () => {
  it("retries 429 for mutating requests and then succeeds", async () => {
    const { calls, fetchFn } = fetchStub(
      () => jsonResponse(429, { message: "slow down" }),
      () => jsonResponse(429, { message: "slow down" }),
      () => jsonResponse(200, { message: "dial queued" }),
    );
    const result = await client(fetchFn).dials.create(sampleDial());
    expect(result.message).toBe("dial queued");
    expect(calls.length).toBe(3);
  });

  it("honors Retry-After and throws RateLimitError when retries run out", async () => {
    const { calls, fetchFn } = fetchStub(() =>
      jsonResponse(429, { message: "slow down" }, { "retry-after": "0" }),
    );
    const error = await client(fetchFn, { maxRetries: 1 })
      .dials.create(sampleDial())
      .catch((e: unknown) => e);
    expect(error).toBeInstanceOf(RateLimitError);
    expect((error as RateLimitError).retryAfter).toBe(0);
    expect(calls.length).toBe(2);
  });

  it("retries 5xx for GET requests", async () => {
    const { calls, fetchFn } = fetchStub(
      () => jsonResponse(500, { message: "oops" }),
      () => jsonResponse(200, { data: [] }),
    );
    await client(fetchFn).nrm.listAnis();
    expect(calls.length).toBe(2);
  });

  it("does not retry 5xx for mutating requests", async () => {
    const { calls, fetchFn } = fetchStub(() =>
      jsonResponse(500, { message: "oops" }),
    );
    const error = await client(fetchFn)
      .dials.create(sampleDial())
      .catch((e: unknown) => e);
    expect(error).toBeInstanceOf(APIError);
    expect(calls.length).toBe(1);
  });

  it("retries network errors for GET requests", async () => {
    const { calls, fetchFn } = fetchStub(
      () => networkError(),
      () => jsonResponse(200, { data: [] }),
    );
    await client(fetchFn).nrm.listAnis();
    expect(calls.length).toBe(2);
  });

  it("does not retry network errors for mutating requests", async () => {
    const { calls, fetchFn } = fetchStub(() => networkError());
    const error = await client(fetchFn)
      .assignment.next({ prospect_phone: "5551234567" })
      .catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ConnectionError);
    expect(calls.length).toBe(1);
  });
});

describe("timeouts and URLs", () => {
  it("aborts slow requests and reports a timeout", async () => {
    const error = await client(hangingFetch, { timeoutMs: 20, maxRetries: 0 })
      .dials.create(sampleDial())
      .catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ConnectionError);
    expect((error as ConnectionError).message).toContain("timed out");
  });

  it("builds query strings and skips undefined params", async () => {
    const { calls, fetchFn } = fetchStub(() => jsonResponse(200, { data: [] }));
    await client(fetchFn).nrm.listAnis({ page: 2, page_size: 50 });
    const url = new URL(calls[0]!.url);
    expect(url.searchParams.get("page")).toBe("2");
    expect(url.searchParams.get("page_size")).toBe("50");
    expect(url.searchParams.has("number")).toBe(false);
  });

  it("strips trailing slashes from a custom baseUrl", async () => {
    const { calls, fetchFn } = fetchStub(() => jsonResponse(200, { data: [] }));
    await client(fetchFn, { baseUrl: "https://staging.example.com/" }).nrm.listAnis();
    expect(calls[0]!.url).toBe("https://staging.example.com/nrm/anis");
  });
});

function sampleDial() {
  return {
    campaign_id: "c-1",
    campaign_name: "Test Campaign",
    agent_name: "Jane Doe",
    from_number: "5551234567",
    to_number: "5559876543",
    disposition_name: "Sale",
    datetime: "2026-04-10 14:32:15",
    call_direction: "Outbound" as const,
    zip: "90210",
    sys_created_date_original: "2026-04-01",
    total_dial_attempts: 3,
    skill_name: "Sales Tier 1",
    lead_source: "facebook-ads",
  };
}
