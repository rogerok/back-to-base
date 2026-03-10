import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { LRUCache } from "./lru-cache.ts";
import { fetchWithCache } from "./index.ts";
import { ResponseSuccess } from "./types.ts";

type TestData = { id: number; name: string };

const createCache = () =>
  new LRUCache<string, ResponseSuccess<TestData>>({ maxSize: 10 });

const mockResponse = (
  status: number,
  body: unknown = {},
  statusText = "OK",
) => {
  return Promise.resolve({
    ok: status >= 200 && status < 300,
    status,
    statusText,
    json: () => Promise.resolve(body),
  } as Response);
};

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
  vi.spyOn(Math, "random").mockReturnValue(0.5);
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe("fetchWithCache", () => {
  it("should fetch multiple urls in parallel and return results", async () => {
    const data1 = { id: 1, name: "one" };
    const data2 = { id: 2, name: "two" };

    vi.stubGlobal(
      "fetch",
      vi.fn((url: string) => {
        if (url.includes("1")) return mockResponse(200, data1);
        return mockResponse(200, data2);
      }),
    );

    const cache = createCache();
    const result = await fetchWithCache<TestData>(
      ["http://api/1", "http://api/2"],
      cache,
      10_000,
    );

    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({
      code: 200,
      data: data1,
      status: "success",
      url: "http://api/1",
    });
    expect(result[1]).toEqual({
      code: 200,
      data: data2,
      status: "success",
      url: "http://api/2",
    });
  });

  it("should return cached results without fetching", async () => {
    const fetchMock = vi.fn(() => mockResponse(200, { id: 1, name: "one" }));
    vi.stubGlobal("fetch", fetchMock);

    const cache = createCache();
    // First call — populates cache
    await fetchWithCache<TestData>(["http://api/1"], cache, 10_000);
    expect(fetchMock).toHaveBeenCalledTimes(1);

    // Second call — should use cache
    const result = await fetchWithCache<TestData>(["http://api/1"], cache, 10_000);
    expect(fetchMock).toHaveBeenCalledTimes(1); // no new fetch
    expect(result[0].status).toBe("success");
    expect((result[0] as ResponseSuccess<TestData>).data).toEqual({
      id: 1,
      name: "one",
    });
  });

  it("should abort all requests on 4xx error", async () => {
    let fetchCount = 0;

    vi.stubGlobal(
      "fetch",
      vi.fn((url: string, init?: RequestInit) => {
        fetchCount++;
        if (url.includes("bad")) return mockResponse(404, null, "Not Found");
        // Simulate a slow request that respects abort
        return new Promise<Response>((resolve, reject) => {
          const timer = setTimeout(
            () => resolve({ ok: true, status: 200, statusText: "OK", json: () => Promise.resolve({ id: 1, name: "slow" }) } as Response),
            5000,
          );
          init?.signal?.addEventListener("abort", () => {
            clearTimeout(timer);
            reject(new DOMException("Aborted", "AbortError"));
          });
        });
      }),
    );

    const cache = createCache();
    const result = await fetchWithCache<TestData>(
      ["http://api/bad", "http://api/slow"],
      cache,
      10_000,
    );

    const badResult = result[0];
    expect(badResult.status).toBe("error");
    expect(badResult.code).toBe(404);
  });

  it("should retry on 5xx with exponential backoff", async () => {
    let attempt = 0;

    vi.stubGlobal(
      "fetch",
      vi.fn(() => {
        attempt++;
        if (attempt < 3) return mockResponse(500, null, "Server Error");
        return mockResponse(200, { id: 1, name: "recovered" });
      }),
    );

    const cache = createCache();
    const result = await fetchWithCache<TestData>(
      ["http://api/flaky"],
      cache,
      10_000,
    );

    expect(attempt).toBe(3);
    expect(result[0]).toEqual({
      code: 200,
      data: { id: 1, name: "recovered" },
      status: "success",
      url: "http://api/flaky",
    });
  });

  it("should stop retrying after maxRetry attempts", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() => mockResponse(500, null, "Server Error")),
    );

    const cache = createCache();
    const maxRetry = 3;
    const result = await fetchWithCache<TestData>(
      ["http://api/always-fail"],
      cache,
      10_000,
      maxRetry,
    );

    expect(result[0]).toMatchObject({
      code: 500,
      error: "Max retry reached",
      status: "error",
      url: "http://api/always-fail",
    });
  });

  it("should abort all requests on timeout", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(
        (_url: string, init?: RequestInit) =>
          new Promise<Response>((resolve, reject) => {
            const timer = setTimeout(
              () =>
                resolve({
                  ok: true,
                  status: 200,
                  statusText: "OK",
                  json: () => Promise.resolve({ id: 1, name: "late" }),
                } as Response),
              20_000,
            );
            init?.signal?.addEventListener("abort", () => {
              clearTimeout(timer);
              reject(new DOMException("Aborted", "AbortError"));
            });
          }),
      ),
    );

    const cache = createCache();
    const timeout = 500;
    const result = await fetchWithCache<TestData>(
      ["http://api/slow1", "http://api/slow2"],
      cache,
      timeout,
    );

    expect(result[0]).toMatchObject({ code: 0, status: "error" });
    expect(result[1]).toMatchObject({ code: 0, status: "error" });
  });

  it("should handle network errors gracefully", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() => Promise.reject(new TypeError("Failed to fetch"))),
    );

    const cache = createCache();
    const result = await fetchWithCache<TestData>(
      ["http://api/no-network"],
      cache,
      10_000,
    );

    expect(result[0]).toMatchObject({
      code: 0,
      status: "error",
      url: "http://api/no-network",
    });
  });

  it("should cache only successful responses", async () => {
    vi.stubGlobal("fetch", vi.fn(() => mockResponse(404, null, "Not Found")));

    const cache = createCache();
    await fetchWithCache<TestData>(["http://api/missing"], cache, 10_000);

    expect(cache.get("http://api/missing")).toBeUndefined();
  });

  it("should mix cached and fresh results preserving order", async () => {
    const data1 = { id: 1, name: "one" };
    const data2 = { id: 2, name: "two" };
    const data3 = { id: 3, name: "three" };

    vi.stubGlobal(
      "fetch",
      vi.fn((url: string) => {
        if (url.includes("1")) return mockResponse(200, data1);
        if (url.includes("2")) return mockResponse(200, data2);
        return mockResponse(200, data3);
      }),
    );

    const cache = createCache();
    // Populate cache with url 2
    await fetchWithCache<TestData>(["http://api/2"], cache, 10_000);

    const fetchMock = vi.mocked(fetch);
    fetchMock.mockClear();

    // Now fetch 1, 2, 3 — url 2 should come from cache
    const result = await fetchWithCache<TestData>(
      ["http://api/1", "http://api/2", "http://api/3"],
      cache,
      10_000,
    );

    // url 2 was cached, so fetch should only be called for 1 and 3
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(result[0].status).toBe("success");
    expect(result[1].status).toBe("success");
    expect(result[2].status).toBe("success");
    expect((result[1] as ResponseSuccess<TestData>).data).toEqual(data2);
  });

  it("should retry 5xx then abort all if it becomes 4xx", async () => {
    let attempt = 0;

    vi.stubGlobal(
      "fetch",
      vi.fn((url: string, init?: RequestInit) => {
        if (url.includes("flaky")) {
          attempt++;
          if (attempt === 1) return mockResponse(500, null, "Server Error");
          return mockResponse(403, null, "Forbidden");
        }
        // slow request for the other URL
        return new Promise<Response>((resolve, reject) => {
          const timer = setTimeout(
            () => resolve({ ok: true, status: 200, statusText: "OK", json: () => Promise.resolve({ id: 2, name: "slow" }) } as Response),
            5000,
          );
          init?.signal?.addEventListener("abort", () => {
            clearTimeout(timer);
            reject(new DOMException("Aborted", "AbortError"));
          });
        });
      }),
    );

    const cache = createCache();
    const result = await fetchWithCache<TestData>(
      ["http://api/flaky", "http://api/slow"],
      cache,
      10_000,
    );

    expect(result[0]).toMatchObject({
      code: 403,
      status: "error",
    });
  });
});
