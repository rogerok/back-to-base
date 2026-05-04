// E9.1–E9.4★★: Typed error channel — IO<A, E>
//
// Will fail to import until the following are exported from index.ts:
//   E9.1: `fail` constructor; IO<A, E> with E = never default
//   E9.2: `attempt`, `orElse`, `mapError`
//   E9.3: `FetchError`, `HttpError` classes; typed `fetchUrl`
//   E9.4: `runIOExit`, `Exit`, `Cause` types; `Die` variant

import { describe, expect, it } from "vitest";
import {
  attempt,
  bind,
  fail,
  fetchUrl,
  makeTestWorld,
  mapError,
  orElse,
  pure,
  readLine,
  runIO,
  writeLine,
} from "../index";

describe("E9.1: IO<A, E> — fail instruction and error channel", () => {
  it("fail(e) has tag 'fail'", () => {
    const io = fail("something went wrong");
    expect(io.tag).toBe("fail");
  });

  it("fail(e) stores the error value", () => {
    const io = fail(42);
    expect((io as any).error).toBe(42);
  });

  it("runIO(fail(e)) rejects the promise", async () => {
    const world = makeTestWorld([], {});
    await expect(runIO(fail("oops"), world)).rejects.toBeDefined();
  });

  it("pure(a) still resolves when E = never (backward compatible)", async () => {
    const world = makeTestWorld([], {});
    const result = await runIO(pure(42), world);
    expect(result).toBe(42);
  });

  it("existing programs compile and run unchanged (E defaults to never)", async () => {
    const world = makeTestWorld(["Alice"], {});
    await runIO(
      bind(writeLine("Name?"), () =>
        bind(readLine, (name) => writeLine(`Hi, ${name}!`))),
      world,
    );
    expect(world.output).toEqual(["Name?", "Hi, Alice!"]);
  });

  it("bind short-circuits on fail: continuation is not called", async () => {
    let called = false;
    const program = bind(fail("error"), (_: never) => {
      called = true;
      return pure("unreachable");
    });
    const world = makeTestWorld([], {});
    await expect(runIO(program, world)).rejects.toBeDefined();
    expect(called).toBe(false);
  });
});

describe("E9.2: attempt, orElse, mapError", () => {
  describe("attempt — makes IO total", () => {
    it("attempt(pure(a)) resolves to { ok: true, value: a }", async () => {
      const world = makeTestWorld([], {});
      const result = await runIO(attempt(pure(42)), world);
      expect(result).toEqual({ ok: true, value: 42 });
    });

    it("attempt(fail(e)) resolves to { ok: false, error: e }", async () => {
      const world = makeTestWorld([], {});
      const result = await runIO(attempt(fail("network error")), world);
      expect(result).toEqual({ ok: false, error: "network error" });
    });

    it("attempt never rejects — error channel becomes a value", async () => {
      const world = makeTestWorld([], {});
      await expect(runIO(attempt(fail("caught")), world)).resolves.toBeDefined();
    });

    it("attempt preserves effects before the failure", async () => {
      const world = makeTestWorld([], {});
      const program = attempt(
        bind(writeLine("before fail"), () => fail("oops")),
      );
      await runIO(program, world);
      expect(world.output).toEqual(["before fail"]);
    });

    it("attempt result is IO<Result<E,A>, never> — runIO resolves", async () => {
      const world = makeTestWorld([], {});
      const result = await runIO(attempt(pure("success")), world);
      expect(result.ok).toBe(true);
    });
  });

  describe("orElse — fallback on error", () => {
    it("orElse(fail(e), fallback) runs the fallback", async () => {
      const world = makeTestWorld([], {});
      const result = await runIO(
        orElse(fail("err"), () => pure("fallback")),
        world,
      );
      expect(result).toBe("fallback");
    });

    it("orElse(pure(a), fallback) returns a, ignores fallback", async () => {
      const world = makeTestWorld([], {});
      let fallbackCalled = false;
      const result = await runIO(
        orElse(pure("ok"), () => {
          fallbackCalled = true;
          return pure("fallback");
        }),
        world,
      );
      expect(result).toBe("ok");
      expect(fallbackCalled).toBe(false);
    });

    it("orElse removes E1 from the error channel", async () => {
      // The resulting program should not reject when the first fails
      const world = makeTestWorld([], {});
      await expect(
        runIO(orElse(fail("handled"), () => pure("recovered")), world),
      ).resolves.toBe("recovered");
    });

    it("orElse passes the error value to the fallback function", async () => {
      const world = makeTestWorld([], {});
      const result = await runIO(
        orElse(fail("the-error"), (e) => pure(`caught: ${e}`)),
        world,
      );
      expect(result).toBe("caught: the-error");
    });
  });

  describe("mapError — transform the error type", () => {
    it("mapError transforms the error value", async () => {
      const world = makeTestWorld([], {});
      const result = await runIO(
        attempt(mapError(fail("err"), (e) => e.toUpperCase())),
        world,
      );
      expect(result).toEqual({ ok: false, error: "ERR" });
    });

    it("mapError on pure(a) — no error to transform, returns a", async () => {
      const world = makeTestWorld([], {});
      const result = await runIO(
        mapError(pure(42), (_e: never) => "unreachable"),
        world,
      );
      expect(result).toBe(42);
    });

    it("mapError wraps raw error in a typed object", async () => {
      const world = makeTestWorld([], {});
      const result = await runIO(
        attempt(mapError(fail("network down"), (e) => ({ message: e, code: 503 }))),
        world,
      );
      expect(result).toEqual({ ok: false, error: { message: "network down", code: 503 } });
    });
  });
});

describe("E9.3★: FetchError and HttpError — typed fetch errors", () => {
  // Will fail until FetchError, HttpError are exported and fetchUrl is rewritten
  it.todo("fetchUrl resolves to string on 2xx");
  it.todo("fetchUrl fails with HttpError on non-2xx response");
  it.todo("fetchUrl fails with FetchError on network error");
  it.todo("FetchError has _tag: 'FetchError' and cause");
  it.todo("HttpError has _tag: 'HttpError', status, and url");
});

describe("E9.4★★: runIOExit — Exit / Cause architecture", () => {
  // Will fail until runIOExit, Exit, Cause, Die are exported
  it.todo("runIOExit(pure(a)) returns { _tag: 'Success', value: a }");
  it.todo("runIOExit(fail(e)) returns { _tag: 'Failure', cause: { _tag: 'Fail', error: e } }");
  it.todo("runIOExit catches Die (unexpected JS exception) separately from Fail");
  it.todo("Cause<E> = Fail<E> | Die<unknown> — two distinct buckets");
});
