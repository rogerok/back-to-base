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
  andThen,
  writeLine,
} from "../index";

const world = {
  readLine: async () => "unused",
  writeLine: async () => undefined,
};

describe("Task 07: typed failures", () => {
  describe("fail", () => {
    it("runIO rejects with the given error value", async () => {
      await expect(runIO(fail("oops"), world)).rejects.toBe("oops");
    });

    it("works with non-string errors", async () => {
      await expect(runIO(fail(404), world)).rejects.toBe(404);
    });

    it("works with object errors", async () => {
      const err = { code: 500, message: "server error" };
      await expect(runIO(fail(err), world)).rejects.toBe(err);
    });

    it("bind continuation is NOT called after fail", async () => {
      let called = false;
      await runIO(
        bind(fail("e"), () => { called = true; return pure("x"); }),
        world,
      ).catch(() => {});
      expect(called).toBe(false);
    });

    it("fail propagates through writeLine — write does NOT happen", async () => {
      const output: string[] = [];
      await runIO(
        andThen(writeLine("before"), fail("stop")),
        { ...world, writeLine: async (l) => { output.push(l); } },
      ).catch(() => {});

      expect(output).toEqual(["before"]);
    });

    it("fail after bind short-circuits remaining chain", async () => {
      let step2 = false;
      let step3 = false;

      await runIO(
        bind(pure(1), () =>
          bind(fail("mid-chain"), () => {
            step2 = true;
            return bind(pure(2), () => { step3 = true; return pure(3); });
          }),
        ),
        world,
      ).catch(() => {});

      expect(step2).toBe(false);
      expect(step3).toBe(false);
    });
  });

  describe("attempt", () => {
    it("wraps a successful result as { ok: true, value }", async () => {
      await expect(runIO(attempt(pure(7)), world)).resolves.toEqual({
        ok: true,
        value: 7,
      });
    });

    it("wraps a failure as { ok: false, error }", async () => {
      await expect(runIO(attempt(fail("boom")), world)).resolves.toEqual({
        ok: false,
        error: "boom",
      });
    });

    it("does not reject when the inner program fails", async () => {
      await expect(runIO(attempt(fail("x")), world)).resolves.toBeDefined();
    });

    it("captures the exact error value", async () => {
      const err = { type: "NOT_FOUND" };
      const result = await runIO(attempt(fail(err)), world);
      expect(result).toMatchObject({ ok: false, error: err });
    });

    it("attempt(pure(x)).value equals x", async () => {
      const result = await runIO(attempt(pure("hello")), world);
      if (!result.ok) throw new Error("expected ok");
      expect(result.value).toBe("hello");
    });
  });

  describe("orElse", () => {
    it("returns the original value when the program succeeds", async () => {
      await expect(
        runIO(orElse(pure(42), () => pure(0)), world),
      ).resolves.toBe(42);
    });

    it("calls the recovery function on failure", async () => {
      await expect(
        runIO(orElse(fail("err"), (e) => pure(`recovered:${e}`)), world),
      ).resolves.toBe("recovered:err");
    });

    it("passes the error value to the recovery function", async () => {
      const result = await runIO(
        orElse(fail({ code: 404 }), (e) => pure(e)),
        world,
      );
      expect(result).toEqual({ code: 404 });
    });

    it("recovery function can also fail", async () => {
      await expect(
        runIO(orElse(fail("first"), () => fail("second")), world),
      ).rejects.toBe("second");
    });

    it("does not call recovery on success", async () => {
      let called = false;
      await runIO(orElse(pure(1), () => { called = true; return pure(0); }), world);
      expect(called).toBe(false);
    });
  });

  describe("mapError", () => {
    it("does not affect a successful program", async () => {
      await expect(
        runIO(mapError(pure(5), () => "new-error"), world),
      ).resolves.toBe(5);
    });

    it("transforms the error value", async () => {
      await expect(
        runIO(mapError(fail("raw"), (e) => `wrapped:${e}`), world),
      ).rejects.toBe("wrapped:raw");
    });

    it("still rejects after mapping", async () => {
      await expect(
        runIO(mapError(fail("x"), (e) => ({ message: e })), world),
      ).rejects.toBeDefined();
    });

    it("mapping function receives the original error", async () => {
      let received: unknown;
      await runIO(
        mapError(fail("original"), (e) => { received = e; return e; }),
        world,
      ).catch(() => {});
      expect(received).toBe("original");
    });
  });

  describe("world exceptions", () => {
    it("world.writeLine throwing is caught by attempt", async () => {
      const result = await runIO(
        attempt(writeLine("x")),
        { ...world, writeLine: async () => { throw new Error("io error"); } },
      );
      expect(result).toMatchObject({ ok: false });
    });

    it("world.readLine throwing is caught by attempt", async () => {
      const result = await runIO(
        attempt(bind(readLine, pure)),
        { ...world, readLine: async () => { throw new Error("no stdin"); } },
      );
      expect(result).toMatchObject({ ok: false });
    });
  });
});
