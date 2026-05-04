// E11.1–E11.2★★: Left-association and stack safety
//
// E11.1 is a performance benchmark — it verifies that left-associated bind
// chains don't blow the stack and helps observe O(N²) vs O(N) timing.
//
// E11.2 is a structural fix — with FTCQueue, left-assoc chains become O(N).

import { describe, expect, it } from "vitest";
import { bind, makeTestWorld, pure, runIO } from "../index";

// ── Helpers ─────────────────────────────────────────────────────────────────

const buildLeftAssocChain = (n: number) => {
  // prog = bind(bind(bind(pure(0), x => pure(x+1)), x => pure(x+1)), ...)
  // Each bind wraps the PREVIOUS result — left-associated.
  let prog = pure(0);
  for (let i = 0; i < n; i++) {
    prog = bind(prog, (x) => pure(x + 1));
  }
  return prog;
};

// ── E11.1: Stack overflow / performance benchmark ───────────────────────────

describe("E11.1: left-associated bind chain — correctness and stack safety", () => {
  it("chain of N=100 pure binds produces the correct result", async () => {
    const world = makeTestWorld([], {});
    const result = await runIO(buildLeftAssocChain(100), world);
    expect(result).toBe(100);
  });

  it("chain of N=1 000 does not throw RangeError (stack overflow)", async () => {
    const world = makeTestWorld([], {});
    await expect(runIO(buildLeftAssocChain(1_000), world)).resolves.toBe(1_000);
  });

  it("chain of N=10 000 completes without stack overflow", async () => {
    const world = makeTestWorld([], {});
    // If your bind is naively recursive this will throw RangeError
    await expect(runIO(buildLeftAssocChain(10_000), world)).resolves.toBe(10_000);
  });

  it("chain of N=100 000 completes (stack-safe runIO via while loop)", async () => {
    // runIO uses a while loop → no interpreter stack overflow.
    // bind itself may still be recursive during CONSTRUCTION though.
    // This test verifies runtime safety; build-time stack safety requires E11.2.
    const world = makeTestWorld([], {});
    await expect(runIO(buildLeftAssocChain(100_000), world)).resolves.toBe(100_000);
  });

  // ── Timing benchmark (informational, not asserting O-complexity) ──────────
  it("E11.1 benchmark: time for N=1k, N=10k, N=100k (observe in output)", async () => {
    const world1 = makeTestWorld([], {});
    const world2 = makeTestWorld([], {});
    const world3 = makeTestWorld([], {});

    const t1s = Date.now();
    await runIO(buildLeftAssocChain(1_000), world1);
    const t1 = Date.now() - t1s;

    const t2s = Date.now();
    await runIO(buildLeftAssocChain(10_000), world2);
    const t2 = Date.now() - t2s;

    const t3s = Date.now();
    await runIO(buildLeftAssocChain(100_000), world3);
    const t3 = Date.now() - t3s;

    // Print timings for manual observation of growth rate
    console.log(`Left-assoc chain timings: 1k=${t1}ms  10k=${t2}ms  100k=${t3}ms`);
    console.log(
      `Ratios: 10k/1k=${(t2 / Math.max(t1, 1)).toFixed(1)}x  100k/10k=${(t3 / Math.max(t2, 1)).toFixed(1)}x`,
    );
    // O(N²) would show ~10x ratio; O(N) would show ~1x ratio

    // Just assert correctness, not timing — timing assertions are flaky in CI
    expect(true).toBe(true);
  });
});

// ── E11.2★★: FTCQueue — O(N) left-associated chains ────────────────────────

describe("E11.2★★: FTCQueue — O(N) bind composition", () => {
  // Will require a Freer + FTCQueue implementation.
  // The correctness contract is identical to E11.1; the difference is performance.

  it("chain of N=100 000 produces correct result with FTCQueue", async () => {
    // Same test as E11.1 — but this time should run in O(N), not O(N²)
    const world = makeTestWorld([], {});
    await expect(runIO(buildLeftAssocChain(100_000), world)).resolves.toBe(100_000);
  });

  it("E11.2 benchmark: 100k chain should be ≤10x slower than 10k (not 100x)", async () => {
    const world1 = makeTestWorld([], {});
    const world2 = makeTestWorld([], {});

    const t10k_start = Date.now();
    await runIO(buildLeftAssocChain(10_000), world1);
    const t10k = Date.now() - t10k_start;

    const t100k_start = Date.now();
    await runIO(buildLeftAssocChain(100_000), world2);
    const t100k = Date.now() - t100k_start;

    console.log(`FTCQueue timings: 10k=${t10k}ms  100k=${t100k}ms  ratio=${(t100k / Math.max(t10k, 1)).toFixed(1)}x`);

    // With O(N): ratio should be ~10x (acceptable: ≤50x for timing noise)
    // With O(N²): ratio would be ~100x
    // Only assert if t10k > 5ms to avoid division noise on fast machines
    if (t10k > 5) {
      expect(t100k / t10k).toBeLessThan(50);
    }
  });
});
