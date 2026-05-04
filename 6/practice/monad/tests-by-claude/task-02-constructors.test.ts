import { describe, expect, it } from "vitest";
import { fetchUrl, makeTestWorld, pure, readLine, runIO, writeLine } from "../index";

describe("E2.1: smart constructors — shape and behavior", () => {
  describe("pure", () => {
    it("has tag 'pure'", () => {
      expect(pure(42).tag).toBe("pure");
    });

    it("stores the given value", () => {
      const io = pure("hello");
      expect((io as any).value).toBe("hello");
    });

    it("resolves immediately via runIO without calling world", async () => {
      const world = makeTestWorld([], {});
      const result = await runIO(pure(99), world);
      expect(result).toBe(99);
    });

    it("works with any type: number, string, object, undefined", async () => {
      const world = makeTestWorld([], {});
      expect(await runIO(pure(0), world)).toBe(0);
      expect(await runIO(pure("x"), world)).toBe("x");
      expect(await runIO(pure(undefined), world)).toBeUndefined();
      expect(await runIO(pure({ a: 1 }), world)).toEqual({ a: 1 });
    });
  });

  describe("readLine", () => {
    it("is a value, not a function", () => {
      expect(typeof readLine).toBe("object");
      expect(readLine).not.toBeNull();
    });

    it("has tag 'readLine'", () => {
      expect(readLine.tag).toBe("readLine");
    });

    it("has a next field that is a function", () => {
      expect(typeof (readLine as any).next).toBe("function");
    });

    it("returns the value from world.readLine when run", async () => {
      const { bind } = await import("../index");
      const world = makeTestWorld(["typed-input"], {});
      const result = await runIO(bind(readLine, pure), world);
      expect(result).toBe("typed-input");
    });
  });

  describe("writeLine", () => {
    it("has tag 'writeLine'", () => {
      expect(writeLine("test").tag).toBe("writeLine");
    });

    it("stores the text", () => {
      const io = writeLine("hello world");
      expect((io as any).text).toBe("hello world");
    });

    it("has a next field that is an IO value", () => {
      const next = (writeLine("x") as any).next;
      expect(typeof next).toBe("object");
      expect(next).toHaveProperty("tag");
    });

    it("calling writeLine does not produce output — only runIO does", () => {
      let called = false;
      const origConsoleLog = console.log;
      console.log = () => { called = true; };
      writeLine("should not appear");
      console.log = origConsoleLog;
      expect(called).toBe(false);
    });

    it("sends text to world.writeLine when run", async () => {
      const world = makeTestWorld([], {});
      await runIO(writeLine("printed"), world);
      expect(world.output).toEqual(["printed"]);
    });
  });

  describe("fetchUrl", () => {
    it("has tag 'fetch'", () => {
      expect(fetchUrl("https://example.com").tag).toBe("fetch");
    });

    it("stores the url", () => {
      const io = fetchUrl("https://api.test/data");
      expect((io as any).url).toBe("https://api.test/data");
    });

    it("stores optional options", () => {
      const opts = { method: "POST" } as RequestInit;
      const io = fetchUrl("https://x.test", opts);
      expect((io as any).options).toBe(opts);
    });

    it("returns the body from world.fetch when run", async () => {
      const { bind } = await import("../index");
      const world = makeTestWorld([], { "https://api.test": "response-body" });
      const result = await runIO(bind(fetchUrl("https://api.test"), pure), world);
      expect(result).toBe("response-body");
    });
  });
});

// E2.2: print — synonym for writeLine
// Will fail (todo) until `print` is exported from index.ts
describe("E2.2: print — synonym for writeLine", () => {
  it.todo("print(text) sends text to world.writeLine (same as writeLine)");
  it.todo("print returns IO<void>");
});
