import { describe, expect, it } from "vitest";
import {
  attempt,
  bind,
  fail,
  mapError,
  orElse,
  pure,
  readLine,
  runIO,
  testWorld,
  writeLine,
} from "../../index";

describe("E9.1 — IO<A, E> type backwards compatibility", () => {
  it("pure(a) still works — IO<A, never>", async () => {
    const world = testWorld([]);
    const result = await runIO(pure(42), world);
    expect(result).toBe(42);
  });

  it("writeLine still works — IO<void, never>", async () => {
    const world = testWorld([]);
    await runIO(writeLine("ok"), world);
    expect(world.output).toEqual(["ok"]);
  });

  it("readLine still works — IO<string, never>", async () => {
    const world = testWorld(["hello"]);
    const result = await runIO(readLine, world);
    expect(result).toBe("hello");
  });
});

describe("E9.1 — fail constructor", () => {
  it("fail produces a node with tag 'fail'", () => {
    const node = fail(new Error("oops"));
    expect(node.tag).toBe("fail");
  });

  it("fail stores the error", () => {
    const err = new Error("oops");
    const node = fail(err);
    if (node.tag !== "fail") throw new Error("expected fail");
    expect(node.error).toBe(err);
  });

  it("runIO rejects when the program ends in fail", async () => {
    const world = testWorld([]);
    await expect(runIO(fail("bad"), world)).rejects.toBe("bad");
  });

  it("bind after fail skips the continuation", async () => {
    const world = testWorld([]);
    const program = bind(fail("err"), () => writeLine("should not run"));
    await expect(runIO(program, world)).rejects.toBe("err");
    expect(world.output).toEqual([]);
  });
});

describe("E9.2 — attempt", () => {
  it("attempt(pure(a)) = pure({ ok: true, value: a })", async () => {
    const world = testWorld([]);
    const result = await runIO(attempt(pure(42)), world);
    expect(result).toEqual({ ok: true, value: 42 });
  });

  it("attempt(fail(e)) = pure({ ok: false, error: e })", async () => {
    const world = testWorld([]);
    const result = await runIO(attempt(fail("boom")), world);
    expect(result).toEqual({ ok: false, error: "boom" });
  });

  it("attempt never rejects — turns fail into a value", async () => {
    const world = testWorld([]);
    await expect(runIO(attempt(fail("anything")), world)).resolves.toBeDefined();
  });

  it("attempt(fail(e)) leaves prior effects intact", async () => {
    const world = testWorld([]);
    const program = bind(writeLine("before"), () => attempt(fail("err")));
    const result = await runIO(program, world);
    expect(world.output).toEqual(["before"]);
    expect(result).toEqual({ ok: false, error: "err" });
  });
});

describe("E9.2 — orElse", () => {
  it("orElse skips fallback on success", async () => {
    const world = testWorld([]);
    const program = orElse(pure(1), () => pure(99));
    const result = await runIO(program, world);
    expect(result).toBe(1);
  });

  it("orElse uses fallback on fail", async () => {
    const world = testWorld([]);
    const program = orElse(fail("oops"), () => pure(42));
    const result = await runIO(program, world);
    expect(result).toBe(42);
  });

  it("orElse receives the error in the fallback function", async () => {
    const world = testWorld([]);
    const program = orElse(
      fail("original-error"),
      (e) => pure(`recovered: ${e}`),
    );
    const result = await runIO(program, world);
    expect(result).toBe("recovered: original-error");
  });

  it("orElse removes E1 from the error channel", async () => {
    // After orElse, the type should be IO<A, E2> — if the fallback itself
    // also fails, that error propagates.
    const world = testWorld([]);
    const program = orElse(fail("e1"), (_e) => fail("e2"));
    await expect(runIO(program, world)).rejects.toBe("e2");
  });
});

describe("E9.2 — mapError", () => {
  it("mapError transforms the error", async () => {
    const world = testWorld([]);
    const program = mapError(fail(42), (n) => `error: ${n}`);
    await expect(runIO(program, world)).rejects.toBe("error: 42");
  });

  it("mapError does not affect success", async () => {
    const world = testWorld([]);
    const program = mapError(pure("ok"), () => "never");
    const result = await runIO(program, world);
    expect(result).toBe("ok");
  });
});

describe("E9.3 ★ — FetchError / HttpError", () => {
  it("fetchUrl with failing world produces a typed FetchError", async () => {
    const { fetchUrl, FetchError, HttpError } = await import("../../index") as any;
    if (!fetchUrl || !FetchError) return;

    const failingWorld = testWorld([], {}); // unmocked URL → fetch throws
    const program = attempt(fetchUrl("https://fail.test/x"));
    const result = await runIO(program, failingWorld);

    expect(result.ok).toBe(false);
    expect(
      result.error instanceof FetchError || result.error instanceof HttpError,
    ).toBe(true);
  });
});
