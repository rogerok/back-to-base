// E7.3★: Sleep instruction
//
// This file will FAIL TO IMPORT until all of the following are implemented in index.ts:
//   1. Sleep<A> type added to the IO<A> union
//   2. `sleep(ms: number): IO<void>` constructor exported
//   3. `sleep(ms: number): Promise<void>` method added to the World interface
//   4. makeTestWorld returns a world with a `sleep` implementation
//   5. runIO handles the "sleep" case
//
// The import error is intentional — it is the TDD signal to implement E7.3.

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { bind, makeTestWorld, pure, runIO, sleep, writeLine } from "../index";

describe("E7.3★: sleep constructor", () => {
  it("sleep(ms) has tag 'sleep'", () => {
    const io = sleep(500);
    expect(io.tag).toBe("sleep");
  });

  it("sleep(ms) stores the ms duration", () => {
    const io = sleep(1500);
    expect((io as any).ms).toBe(1500);
  });

  it("sleep's next is an IO<A> value, not a callback function (sleep returns void)", () => {
    // Unlike readLine.next: (s: string) => IO<A>, sleep.next is just IO<A>
    const io = sleep(0);
    const next = (io as any).next;
    expect(typeof next).toBe("object");
    expect(next).toHaveProperty("tag");
  });

  it("sleep is a value, not a function", () => {
    // sleep(ms) should return an IO value — construction has no side effects
    const io = sleep(100);
    expect(typeof io).toBe("object");
    expect(io).not.toBeNull();
  });
});

describe("E7.3★: runIO with sleep — using vi.useFakeTimers()", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("calls world.sleep with the correct duration", async () => {
    const durations: number[] = [];
    const world: any = {
      ...makeTestWorld([], {}),
      sleep: async (ms: number) => {
        durations.push(ms);
      },
    };

    await runIO(sleep(300), world);
    expect(durations).toEqual([300]);
  });

  it("large sleep completes instantly with fake timers (no real wait)", async () => {
    const world: any = {
      ...makeTestWorld([], {}),
      sleep: (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms)),
    };

    const run = runIO(
      bind(sleep(60_000), () => pure("done")),
      world,
    );
    await vi.runAllTimersAsync();
    const result = await run;
    expect(result).toBe("done");
  });

  it("sleep integrates with surrounding effects in the correct order", async () => {
    const world: any = {
      ...makeTestWorld([], {}),
      sleep: async (_ms: number) => {},
    };

    const program = bind(writeLine("before sleep"), () =>
      bind(sleep(100), () => writeLine("after sleep")),
    );

    await runIO(program, world);
    expect(world.output).toEqual(["before sleep", "after sleep"]);
  });

  it("sleep(0) also works — zero-duration sleep still completes", async () => {
    const world: any = {
      ...makeTestWorld([], {}),
      sleep: (ms: number) => new Promise<void>((r) => setTimeout(r, ms)),
    };

    const run = runIO(
      bind(sleep(0), () => pure("zero")),
      world,
    );
    await vi.runAllTimersAsync();
    expect(await run).toBe("zero");
  });
});
