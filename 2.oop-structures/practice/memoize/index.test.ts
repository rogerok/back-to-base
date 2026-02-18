import { describe, expect, it, vi } from "vitest";

import { memoize } from "./index.ts";

describe("memoize", () => {
  it("caches result for same arguments", () => {
    const spy = vi.fn((a: number, b: number) => a + b);
    const memoized = memoize(spy);

    const result1 = memoized(1, 2);
    const result2 = memoized(1, 2);

    expect(result1).toBe(3);
    expect(result2).toBe(3);

    expect(spy).toHaveBeenCalledTimes(1);
  });

  it("calls original function for different arguments", () => {
    const spy = vi.fn((a: number, b: number) => a + b);
    const memoized = memoize(spy);

    memoized(1, 2);
    memoized(2, 3);

    expect(spy).toHaveBeenCalledTimes(2);
  });

  it("clears cache when clear() is called", () => {
    const spy = vi.fn((a: number, b: number) => a + b);
    const memoized = memoize(spy);

    memoized(1, 2);
    memoized(1, 2);

    expect(spy).toHaveBeenCalledTimes(1);

    memoized.clear();

    memoized(1, 2);

    expect(spy).toHaveBeenCalledTimes(2);
  });

  it("evicts least recently used when cache is full", () => {
    const spy = vi.fn((a: number, b: number) => a + b);
    const memoized = memoize(spy);

    memoized(1, 1);
    memoized(2, 2);
    memoized(3, 3);

    memoized(1, 1);

    expect(spy).toHaveBeenCalledTimes(4);
  });

  it("respects LRU order (recently used should survive)", () => {
    const spy = vi.fn((a: number, b: number) => a + b);
    const memoized = memoize(spy);

    memoized(1, 1);
    memoized(2, 2);
    memoized(1, 1);
    memoized(3, 3);

    memoized(2, 2);

    expect(spy).toHaveBeenCalledTimes(4);
  });
});
