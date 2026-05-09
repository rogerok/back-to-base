import { describe, expect, it } from "vitest";
import { bind, pure } from "../../index";

function buildLeftAssociated(n: number): unknown {
  let prog: any = pure(0);
  for (let i = 0; i < n; i++) {
    prog = bind(prog, (x: number) => pure(x + 1));
  }
  return prog;
}

function buildRightAssociated(n: number): unknown {
  const step = (i: number, k: (x: number) => any): any =>
    i === n ? k(0) : step(i + 1, (x: number) => bind(pure(x + 1), k));
  return step(0, (x: number) => pure(x));
}

function measure(fn: () => void): number {
  const start = performance.now();
  fn();
  return performance.now() - start;
}

describe("E11.1 — left-associated bind is O(N²)", () => {
  it("builds correctly for small N", () => {
    const prog = buildLeftAssociated(10) as any;
    // The result is a nested IO tree — just check it exists
    expect(prog).toBeDefined();
    expect(typeof prog).toBe("object");
  });

  it("left-associated N=1000 is slower than right-associated N=1000", () => {
    const N = 1000;
    const timeLeft = measure(() => buildLeftAssociated(N));
    const timeRight = measure(() => buildRightAssociated(N));
    // Left should be measurably slower; at N=1000 the O(N²) vs O(N) gap
    // is already visible. Allow for environment noise with a loose ratio.
    // If this is flaky, raise N or compare ratios at multiple sizes.
    console.log(`Left: ${timeLeft.toFixed(2)}ms  Right: ${timeRight.toFixed(2)}ms`);
    expect(timeLeft).toBeGreaterThanOrEqual(timeRight);
  });

  it("left-associated N=5000 vs N=1000 scales super-linearly", () => {
    const time1k = measure(() => buildLeftAssociated(1000));
    const time5k = measure(() => buildLeftAssociated(5000));
    const ratio = time5k / time1k;
    console.log(
      `1k: ${time1k.toFixed(2)}ms  5k: ${time5k.toFixed(2)}ms  ratio: ${ratio.toFixed(1)}x`,
    );
    // O(N²) predicts ratio ~25×; allow ≥5× as a loose lower bound
    expect(ratio).toBeGreaterThan(5);
  });

  it("right-associated N=5000 vs N=1000 scales linearly (ratio ≈ 5)", () => {
    const time1k = measure(() => buildRightAssociated(1000));
    const time5k = measure(() => buildRightAssociated(5000));
    const ratio = time5k / time1k;
    console.log(
      `1k: ${time1k.toFixed(2)}ms  5k: ${time5k.toFixed(2)}ms  ratio: ${ratio.toFixed(1)}x`,
    );
    // O(N) predicts ratio ≈ 5; allow up to 20× for JIT noise
    expect(ratio).toBeLessThan(20);
  });
});
