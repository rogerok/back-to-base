import { describe, expect, it, vi } from "vitest";
import { bind, fetchUrl, loggingWorld, makeTestWorld, pure, readLine, runIO, writeLine } from "../index";

describe("E6.1: makeTestWorld — deterministic test environment", () => {
  it("captures writeLine calls in output array, in order", async () => {
    const world = makeTestWorld([], {});
    await runIO(
      bind(writeLine("first"), () => bind(writeLine("second"), () => writeLine("third"))),
      world,
    );
    expect(world.output).toEqual(["first", "second", "third"]);
  });

  it("provides readLine inputs in FIFO order", async () => {
    const world = makeTestWorld(["a", "b", "c"], {});
    const result = await runIO(
      bind(readLine, (x) => bind(readLine, (y) => bind(readLine, (z) => pure([x, y, z])))),
      world,
    );
    expect(result).toEqual(["a", "b", "c"]);
  });

  it("throws (fail loud) when readLine is called more times than inputs provided", async () => {
    const world = makeTestWorld(["only-one"], {});
    await runIO(readLine, world); // consume the only input
    await expect(runIO(readLine, world)).rejects.toThrow();
  });

  it("does not silently return empty string on exhausted input", async () => {
    const world = makeTestWorld([], {});
    await expect(runIO(readLine, world)).rejects.toThrow();
  });

  it("output array starts empty", () => {
    const world = makeTestWorld([], {});
    expect(world.output).toEqual([]);
  });
});

describe("E7.2: makeTestWorld fetch mock — fail loud on unmocked URLs", () => {
  it("throws for an unmocked URL with the url in the error message", async () => {
    const world = makeTestWorld([], {});
    await expect(
      runIO(fetchUrl("https://not-mocked.test"), world),
    ).rejects.toThrow("https://not-mocked.test");
  });

  it("returns the mocked body for a known URL", async () => {
    const world = makeTestWorld([], { "https://api.test": "mocked-body" });
    const result = await runIO(bind(fetchUrl("https://api.test"), pure), world);
    expect(result).toBe("mocked-body");
  });

  it("different URLs return their respective mocked bodies", async () => {
    const world = makeTestWorld([], {
      "https://a.test": "body-a",
      "https://b.test": "body-b",
    });
    const a = await runIO(bind(fetchUrl("https://a.test"), pure), world);
    const b = await runIO(bind(fetchUrl("https://b.test"), pure), world);
    expect(a).toBe("body-a");
    expect(b).toBe("body-b");
  });

  it("does not silently return empty string for unmocked URL", async () => {
    const world = makeTestWorld([], {});
    const result = runIO(fetchUrl("https://missing.test"), world);
    await expect(result).rejects.toThrow();
  });
});

describe("E6.3★: loggingWorld — transparent decorator over inner world", () => {
  it("writeLine: output appears in inner world", async () => {
    const inner = makeTestWorld([], {});
    const logged = loggingWorld(inner);
    await runIO(writeLine("delegated"), logged);
    expect(inner.output).toEqual(["delegated"]);
  });

  it("readLine: returns the same value as inner world would", async () => {
    const inner = makeTestWorld(["delegate-value"], {});
    const logged = loggingWorld(inner);
    const result = await runIO(bind(readLine, pure), logged);
    expect(result).toBe("delegate-value");
  });

  it("fetch: returns the same body as inner world would", async () => {
    const inner = makeTestWorld([], { "https://api.test": "inner-body" });
    const logged = loggingWorld(inner);
    const result = await runIO(bind(fetchUrl("https://api.test"), pure), logged);
    expect(result).toBe("inner-body");
  });

  it("loggingWorld propagates errors from inner world (does not swallow)", async () => {
    const inner = makeTestWorld([], {}); // no inputs
    const logged = loggingWorld(inner);
    await expect(runIO(readLine, logged)).rejects.toThrow();
  });

  it("loggingWorld propagates unmocked fetch errors from inner world", async () => {
    const inner = makeTestWorld([], {}); // no mocks
    const logged = loggingWorld(inner);
    await expect(runIO(fetchUrl("https://unknown.test"), logged)).rejects.toThrow();
  });
});

describe("E6.2: same IO program runs identically in any testWorld", () => {
  const program = bind(writeLine("Hello?"), () =>
    bind(readLine, (name) => writeLine(`Got: ${name}`)));

  it("produces the same output for the same inputs in two separate worlds", async () => {
    const world1 = makeTestWorld(["Alice"], {});
    const world2 = makeTestWorld(["Alice"], {});
    await runIO(program, world1);
    await runIO(program, world2);
    expect(world1.output).toEqual(world2.output);
  });

  it("program value is reusable across worlds without modification", async () => {
    const worldA = makeTestWorld(["Alice"], {});
    const worldB = makeTestWorld(["Bob"], {});
    await runIO(program, worldA);
    await runIO(program, worldB);
    expect(worldA.output[1]).toContain("Alice");
    expect(worldB.output[1]).toContain("Bob");
  });
});
