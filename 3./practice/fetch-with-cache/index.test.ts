import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fetchWithCache } from "./index";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

let urlCounter = 0;
/** Generate a unique URL so module-level cache doesn't bleed between tests. */
function url(tag = "ok"): string {
  return `https://api.test.com/${tag}/${++urlCounter}`;
}

function mockResponse(status: number, data: unknown = { ok: true }) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: vi.fn().mockResolvedValue(data),
  } as unknown as Response;
}

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

const fetchMock = vi.fn<typeof fetch>();

beforeEach(() => {
  vi.stubGlobal("fetch", fetchMock);
  vi.useFakeTimers();
});

afterEach(() => {
  fetchMock.mockReset();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

// ===========================================================================
// 1. Basic happy path
// ===========================================================================

describe("happy path", () => {
  it("returns parsed JSON for a single 200 URL", async () => {
    const data = { id: 1 };
    const u = url();
    fetchMock.mockResolvedValueOnce(mockResponse(200, data));

    const promise = fetchWithCache([u]);
    await vi.runAllTimersAsync();
    const [result] = await promise;

    expect(result.status).toBe("fulfilled");
    if (result.status === "fulfilled") {
      expect(result.value).toEqual(data);
    }
  });

  it("returns one result per URL", async () => {
    const urls = [url(), url(), url()];
    fetchMock.mockResolvedValue(mockResponse(200, { ok: true }));

    const promise = fetchWithCache(urls);
    await vi.runAllTimersAsync();
    const results = await promise;

    expect(results).toHaveLength(3);
  });

  it("returns empty array for empty input", async () => {
    const promise = fetchWithCache([]);
    await vi.runAllTimersAsync();
    const results = await promise;

    expect(results).toEqual([]);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

// ===========================================================================
// 2. Caching
// ===========================================================================

describe("LRU cache", () => {
  it("does NOT call fetch for a URL that is already cached", async () => {
    const u = url("cached");
    fetchMock.mockResolvedValue(mockResponse(200, { v: 1 }));

    // First call – populates cache
    const p1 = fetchWithCache([u]);
    await vi.runAllTimersAsync();
    await p1;

    fetchMock.mockClear();

    // Second call – should hit cache, fetch must not be called
    const p2 = fetchWithCache([u]);
    await vi.runAllTimersAsync();
    await p2;

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("returns the same data from cache as from the original fetch", async () => {
    const data = { name: "Alice" };
    const u = url("cached-data");
    fetchMock.mockResolvedValue(mockResponse(200, data));

    const p1 = fetchWithCache([u]);
    await vi.runAllTimersAsync();
    await p1;

    const p2 = fetchWithCache([u]);
    await vi.runAllTimersAsync();
    const [result] = await p2;

    expect(result.status).toBe("fulfilled");
    if (result.status === "fulfilled") {
      expect(result.value).toEqual(data);
    }
  });

  it("caches the parsed JSON object, not the raw Response", async () => {
    const data = { parsed: true };
    const u = url("parsed");
    const resp = mockResponse(200, data);
    fetchMock.mockResolvedValueOnce(resp);

    const promise = fetchWithCache([u]);
    await vi.runAllTimersAsync();
    const [result] = await promise;

    // .json() must have been called (response was consumed and parsed)
    expect(resp.json).toHaveBeenCalled();
    expect(result.status).toBe("fulfilled");
    if (result.status === "fulfilled") {
      expect(result.value).toEqual(data);
    }
  });

  it("fetches only uncached URLs when mixed with cached ones", async () => {
    const cached = url("mix-cached");
    const fresh = url("mix-fresh");

    fetchMock.mockResolvedValue(mockResponse(200, {}));

    // Pre-populate cache for `cached`
    const p1 = fetchWithCache([cached]);
    await vi.runAllTimersAsync();
    await p1;
    fetchMock.mockClear();

    // Now request both
    const p2 = fetchWithCache([cached, fresh]);
    await vi.runAllTimersAsync();
    await p2;

    // Only the fresh URL should trigger a fetch
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith(fresh, expect.anything());
  });
});

// ===========================================================================
// 3. Parallel execution
// ===========================================================================

describe("parallel execution", () => {
  it("starts all fetch calls before any of them resolves", async () => {
    const urls = [url("p1"), url("p2"), url("p3")];
    // Simulate slow responses by never auto-resolving
    let resolvers: Array<() => void> = [];
    fetchMock.mockImplementation(() => {
      return new Promise<Response>((resolve) => {
        resolvers.push(() => resolve(mockResponse(200, {})));
      });
    });

    const promise = fetchWithCache(urls);

    // All three fetch calls must have been initiated synchronously / before
    // any response arrives
    expect(fetchMock).toHaveBeenCalledTimes(3);

    // Resolve all and finish
    resolvers.forEach((r) => r());
    await vi.runAllTimersAsync();
    await promise;
  });

  it("uses Promise.allSettled semantics – collects all results even on partial failure", async () => {
    const [u1, u2, u3] = [url(), url(), url()];

    fetchMock
      .mockResolvedValueOnce(mockResponse(200, { a: 1 }))
      .mockRejectedValueOnce(new Error("network error"))
      .mockResolvedValueOnce(mockResponse(200, { c: 3 }));

    const promise = fetchWithCache([u1, u2, u3]);
    await vi.runAllTimersAsync();
    const results = await promise;

    expect(results).toHaveLength(3);
    const statuses = results.map((r) => r.status);
    expect(statuses).toContain("fulfilled");
  });
});

// ===========================================================================
// 4. 4xx – abort all
// ===========================================================================

describe("4xx handling", () => {
  it.each([400, 401, 403, 404])(
    "%i response aborts all other pending requests",
    async (statusCode) => {
      const [u1, u2] = [url(`${statusCode}-a`), url(`${statusCode}-b`)];

      // u1 → 4xx, u2 → 200 (should be aborted before it resolves)
      fetchMock
        .mockResolvedValueOnce(mockResponse(statusCode))
        .mockResolvedValueOnce(mockResponse(200, {}));

      const promise = fetchWithCache([u1, u2]);
      await vi.runAllTimersAsync();
      const results = await promise;

      // u1 must be rejected (4xx error)
      expect(results[0].status).toBe("rejected");
      // u2 must be rejected too (AbortError or 4xx cascade)
      expect(results[1].status).toBe("rejected");
    },
  );

  it("does NOT retry on 4xx", async () => {
    const u = url("no-retry-4xx");
    fetchMock.mockResolvedValue(mockResponse(404));

    const promise = fetchWithCache([u]);
    await vi.runAllTimersAsync();
    await promise;

    // fetch called exactly once – no retry
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("passes AbortSignal to all fetch calls", async () => {
    const urls = [url("sig1"), url("sig2")];
    fetchMock.mockResolvedValue(mockResponse(200, {}));

    const promise = fetchWithCache(urls);
    await vi.runAllTimersAsync();
    await promise;

    for (const call of fetchMock.mock.calls) {
      const [, init] = call as [string, RequestInit];
      expect(init?.signal).toBeDefined();
      expect(init?.signal).toBeInstanceOf(AbortSignal);
    }
  });
});

// ===========================================================================
// 5. 5xx – retry with exponential back-off + jitter
// ===========================================================================

describe("5xx retry", () => {
  it.each([500, 502, 503, 504])(
    "retries on %i and succeeds when server recovers",
    async (statusCode) => {
      const u = url(`retry-${statusCode}`);
      fetchMock
        .mockResolvedValueOnce(mockResponse(statusCode))
        .mockResolvedValueOnce(mockResponse(statusCode))
        .mockResolvedValueOnce(mockResponse(200, { recovered: true }));

      const promise = fetchWithCache([u]);
      await vi.runAllTimersAsync();
      const [result] = await promise;

      expect(result.status).toBe("fulfilled");
      if (result.status === "fulfilled") {
        expect(result.value).toEqual({ recovered: true });
      }
      expect(fetchMock).toHaveBeenCalledTimes(3);
    },
  );

  it("fails after maxRetries consecutive 5xx responses", async () => {
    const u = url("max-retries");
    // Always return 500
    fetchMock.mockResolvedValue(mockResponse(500));

    const promise = fetchWithCache([u]);
    await vi.runAllTimersAsync();
    const [result] = await promise;

    expect(result.status).toBe("rejected");
    // Fetch must have been called more than once (retried) but has a limit
    expect(fetchMock.mock.calls.length).toBeGreaterThan(1);
    // Not infinite – hard upper bound sanity check
    expect(fetchMock.mock.calls.length).toBeLessThanOrEqual(10);
  });

  it("uses increasing delays between retries (exponential back-off)", async () => {
    const u = url("backoff");
    fetchMock
      .mockResolvedValueOnce(mockResponse(500))
      .mockResolvedValueOnce(mockResponse(500))
      .mockResolvedValueOnce(mockResponse(200, {}));

    const setTimeoutSpy = vi.spyOn(globalThis, "setTimeout");

    const promise = fetchWithCache([u]);
    await vi.runAllTimersAsync();
    await promise;

    // Collect delay values passed to setTimeout (filter out the 10s global timeout)
    const retryDelays = setTimeoutSpy.mock.calls
      .map(([, ms]) => ms as number)
      .filter((ms) => ms !== undefined && ms < 10_000);

    // There should be at least 2 retry delays and the second should be >= the first
    expect(retryDelays.length).toBeGreaterThanOrEqual(2);
    expect(retryDelays[1]).toBeGreaterThanOrEqual(retryDelays[0]!);
  });

  it("does not retry an AbortError – propagates it immediately", async () => {
    const u = url("abort-no-retry");
    const abortError = new DOMException("Aborted", "AbortError");
    fetchMock.mockRejectedValueOnce(abortError);

    const promise = fetchWithCache([u]);
    await vi.runAllTimersAsync();
    const [result] = await promise;

    expect(result.status).toBe("rejected");
    // fetch must have been called exactly once – AbortError should not trigger retry
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("stops retrying immediately if signal is aborted during back-off sleep", async () => {
    const [uSlow, uFast] = [url("slow-5xx"), url("fast-4xx")];

    // uFast returns 4xx → triggers abort for uSlow mid-retry-sleep
    fetchMock
      .mockResolvedValueOnce(mockResponse(500)) // uSlow attempt 0
      .mockResolvedValueOnce(mockResponse(400)); // uFast attempt 0

    const promise = fetchWithCache([uSlow, uFast]);
    await vi.runAllTimersAsync();
    const results = await promise;

    // uSlow must not have retried (signal was aborted while sleeping)
    const slowCallCount = fetchMock.mock.calls.filter(
      ([u]) => u === uSlow,
    ).length;
    expect(slowCallCount).toBe(1);

    results.forEach((r) => expect(r.status).toBe("rejected"));
  });
});

// ===========================================================================
// 6. Global 10-second timeout
// ===========================================================================

describe("10-second global timeout", () => {
  it("aborts all requests when 10 seconds elapse", async () => {
    const urls = [url("slow1"), url("slow2")];
    // Fetch never resolves (simulates very slow server)
    fetchMock.mockImplementation(() => new Promise(() => {}));

    const promise = fetchWithCache(urls);

    // Advance time past the 10-second global timeout
    await vi.advanceTimersByTimeAsync(10_001);

    const results = await promise;

    results.forEach((r) => {
      expect(r.status).toBe("rejected");
      if (r.status === "rejected") {
        expect((r.reason as DOMException).name).toBe("AbortError");
      }
    });
  });

  it("clears the global timeout when all requests finish before 10 seconds", async () => {
    const u = url("fast");
    fetchMock.mockResolvedValueOnce(mockResponse(200, {}));

    const clearTimeoutSpy = vi.spyOn(globalThis, "clearTimeout");

    const promise = fetchWithCache([u]);
    await vi.runAllTimersAsync();
    await promise;

    // clearTimeout must have been called (to clean up the 10-second timer)
    expect(clearTimeoutSpy).toHaveBeenCalled();
  });

  it("clears the global timeout even when a request fails", async () => {
    const u = url("fail-clean");
    fetchMock.mockResolvedValueOnce(mockResponse(404));

    const clearTimeoutSpy = vi.spyOn(globalThis, "clearTimeout");

    const promise = fetchWithCache([u]);
    await vi.runAllTimersAsync();
    await promise;

    expect(clearTimeoutSpy).toHaveBeenCalled();
  });
});

// ===========================================================================
// 7. Network / edge-case errors
// ===========================================================================

describe("network errors", () => {
  it("treats a network-level rejection (no response) as retryable", async () => {
    const u = url("net-err");
    fetchMock
      .mockRejectedValueOnce(new TypeError("Failed to fetch"))
      .mockResolvedValueOnce(mockResponse(200, { ok: true }));

    const promise = fetchWithCache([u]);
    await vi.runAllTimersAsync();
    const [result] = await promise;

    expect(result.status).toBe("fulfilled");
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});

// ===========================================================================
// 8. Duplicate URLs in input
// ===========================================================================

describe("duplicate URLs", () => {
  it("does not crash when the same URL appears multiple times", async () => {
    const u = url("dup");
    fetchMock.mockResolvedValue(mockResponse(200, {}));

    const promise = fetchWithCache([u, u, u]);
    await vi.runAllTimersAsync();
    const results = await promise;

    expect(results).toHaveLength(3);
  });

  it("returns a result for every position in the input array", async () => {
    const u = url("dup-count");
    fetchMock.mockResolvedValue(mockResponse(200, { n: 1 }));

    const promise = fetchWithCache([u, u]);
    await vi.runAllTimersAsync();
    const results = await promise;

    expect(results).toHaveLength(2);
  });
});
