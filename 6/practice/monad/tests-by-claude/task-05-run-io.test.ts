import { describe, expect, it, vi } from "vitest";
import { bind, fetchUrl, makeTestWorld, pure, readLine, runIO, writeLine } from "../index";
import type { World } from "../index";

// Minimal hand-rolled world for fine-grained control
const makeSpyWorld = (): World & {
  written: string[];
  reads: string[];
  fetched: string[];
} => {
  const written: string[] = [];
  const reads = ["input-1", "input-2", "input-3"];
  const fetched: string[] = [];
  return {
    fetch: async (url) => { fetched.push(url); return `body:${url}`; },
    fetched,
    readLine: async () => reads.shift() ?? (() => { throw new Error("no input"); })(),
    reads,
    writeLine: async (s) => { written.push(s); },
    written,
  };
};

describe("E5.1: runIO — interprets IO programs via the World interface", () => {
  it("runIO(pure(value)) resolves to value immediately", async () => {
    const world = makeTestWorld([], {});
    const result = await runIO(pure("hello"), world);
    expect(result).toBe("hello");
  });

  it("runIO(pure(value)) does not call any world method", async () => {
    const spy = makeSpyWorld();
    const readLineSpy = vi.spyOn(spy, "readLine");
    const writeLineSpy = vi.spyOn(spy, "writeLine");

    await runIO(pure(42), spy);

    expect(readLineSpy).not.toHaveBeenCalled();
    expect(writeLineSpy).not.toHaveBeenCalled();
  });

  it("runIO calls world.writeLine with the correct text", async () => {
    const spy = makeSpyWorld();
    await runIO(writeLine("hello from runIO"), spy);
    expect(spy.written).toEqual(["hello from runIO"]);
  });

  it("runIO calls world.readLine and threads the result into the continuation", async () => {
    const spy = makeSpyWorld();
    const result = await runIO(bind(readLine, pure), spy);
    expect(result).toBe("input-1");
  });

  it("runIO calls world.fetch with the correct url", async () => {
    const spy = makeSpyWorld();
    await runIO(bind(fetchUrl("https://api.test"), pure), spy);
    expect(spy.fetched).toEqual(["https://api.test"]);
  });

  it("runIO processes writeLine → readLine → writeLine in the correct order", async () => {
    const world = makeTestWorld(["Alice"], {});
    await runIO(
      bind(writeLine("Name?"), () =>
        bind(readLine, (name) => writeLine(`Hi, ${name}!`))),
      world,
    );
    expect(world.output).toEqual(["Name?", "Hi, Alice!"]);
  });

  it("runIO returns a Promise that resolves to the final value", async () => {
    const world = makeTestWorld([], {});
    const promise = runIO(pure(123), world);
    expect(promise).toBeInstanceOf(Promise);
    expect(await promise).toBe(123);
  });
});

describe("E5.2: runIO progresses through effects — regression for missing current update", () => {
  it("two consecutive readLines receive different inputs (not the same line twice)", async () => {
    const world = makeTestWorld(["first", "second"], {});
    const result = await runIO(
      bind(readLine, (a) => bind(readLine, (b) => pure([a, b]))),
      world,
    );
    expect(result).toEqual(["first", "second"]);
    expect(result[0]).not.toBe(result[1]);
  });

  it("three writeLines each call world.writeLine once (no loop)", async () => {
    const spy = makeSpyWorld();
    await runIO(
      bind(writeLine("a"), () => bind(writeLine("b"), () => writeLine("c"))),
      spy,
    );
    expect(spy.written).toEqual(["a", "b", "c"]);
  });

  it("fetch result is passed forward, not re-fetched", async () => {
    const spy = makeSpyWorld();
    const result = await runIO(
      bind(fetchUrl("https://x.test"), (body) => pure(body)),
      spy,
    );
    expect(result).toBe("body:https://x.test");
    expect(spy.fetched).toHaveLength(1);
  });
});
