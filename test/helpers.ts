export interface RecordedCall {
  url: string;
  method: string;
  headers: Record<string, string>;
  body: string | undefined;
}

export function jsonResponse(
  status: number,
  body: unknown,
  headers: Record<string, string> = {},
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", ...headers },
  });
}

type Handler = (call: RecordedCall) => Response | Promise<Response> | Error;

/**
 * Builds a fetch stub that records every call. The nth call is served by the
 * nth handler; extra calls reuse the last handler. A handler may return an
 * Error to simulate a network failure.
 */
export function fetchStub(...handlers: Handler[]) {
  const calls: RecordedCall[] = [];
  const fetchFn = (async (
    input: RequestInfo | URL,
    init?: RequestInit,
  ): Promise<Response> => {
    const call: RecordedCall = {
      url: String(input),
      method: init?.method ?? "GET",
      headers: { ...(init?.headers as Record<string, string> | undefined) },
      body: typeof init?.body === "string" ? init.body : undefined,
    };
    calls.push(call);
    const handler = handlers[Math.min(calls.length - 1, handlers.length - 1)];
    if (!handler) throw new Error("fetchStub: no handler configured");
    const result = await handler(call);
    if (result instanceof Error) throw result;
    return result;
  }) as typeof fetch;
  return { calls, fetchFn };
}

/** A fetch that never resolves until it is aborted, for timeout tests. */
export const hangingFetch = ((_input: RequestInfo | URL, init?: RequestInit) =>
  new Promise<Response>((_resolve, reject) => {
    init?.signal?.addEventListener("abort", () =>
      reject(Object.assign(new Error("aborted"), { name: "AbortError" })),
    );
  })) as typeof fetch;

export function networkError(): Error {
  return Object.assign(new Error("socket hang up"), { name: "FetchError" });
}
