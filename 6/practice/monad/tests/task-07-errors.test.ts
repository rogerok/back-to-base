import { describe, expect, it } from "vitest";

import { attempt, bind, fail, mapError, orElse, pure, runIO, writeLine } from "../index";

describe("Task 07: typed failures", () => {
  it("fail short-circuits bind continuations", async () => {
    let continuationCalled = false;

    await expect(
      runIO(
        bind(fail("boom"), () => {
          continuationCalled = true;
          return pure("unreachable");
        }),
        {
          readLine: async () => "unused",
          writeLine: async () => undefined,
        },
      ),
    ).rejects.toBe("boom");

    expect(continuationCalled).toBe(false);
  });

  it("attempt turns success and failure into result values", async () => {
    const world = {
      readLine: async () => "unused",
      writeLine: async () => undefined,
    };

    await expect(runIO(attempt(pure(42)), world)).resolves.toEqual({
      ok: true,
      value: 42,
    });
    await expect(runIO(attempt(fail("boom")), world)).resolves.toEqual({
      error: "boom",
      ok: false,
    });
  });

  it("orElse recovers from a failure with a fallback program", async () => {
    await expect(
      runIO(
        orElse(fail("missing"), (error) => pure(`fallback:${error}`)),
        {
          readLine: async () => "unused",
          writeLine: async () => undefined,
        },
      ),
    ).resolves.toBe("fallback:missing");
  });

  it("mapError transforms the error channel", async () => {
    await expect(
      runIO(
        mapError(fail("boom"), (error) => ({ message: error })),
        {
          readLine: async () => "unused",
          writeLine: async () => undefined,
        },
      ),
    ).rejects.toEqual({ message: "boom" });
  });

  it("runIO converts world exceptions into DSL failures that attempt can catch", async () => {
    const program = attempt(writeLine("will fail"));

    await expect(
      runIO(program, {
        readLine: async () => "unused",
        writeLine: async () => {
          throw new Error("write failed");
        },
      }),
    ).resolves.toMatchObject({
      error: expect.any(Error),
      ok: false,
    });
  });
});
