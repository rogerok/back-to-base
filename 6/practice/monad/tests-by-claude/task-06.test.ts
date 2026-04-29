import { describe, expect, it } from "vitest";

import { bind, fetchProgram, fetchUrl, pure, runIO, andThen, writeLine } from "../index";

const makeWorld = (fetchImpl: (url: string) => Promise<string>, inputs: string[] = []) => {
  const output: string[] = [];
  return {
    output,
    fetch: fetchImpl,
    readLine: async () => {
      const v = inputs.shift();
      if (v === undefined) throw new Error("No input");
      return v;
    },
    writeLine: async (line: string) => {
      output.push(line);
    },
  };
};

describe("Task 06: fetch instruction", () => {
  describe("fetchUrl constructor", () => {
    it("produces an IO value, not a plain value", () => {
      const io = fetchUrl("https://example.com");
      expect(typeof io).toBe("object");
      expect(io).not.toBeNull();
    });

    it("has a fetch-related tag", () => {
      const io = fetchUrl("https://example.com");
      expect((io as any).tag).toBeDefined();
    });
  });

  describe("runIO with fetch", () => {
    it("calls world.fetch with the correct URL", async () => {
      const fetched: string[] = [];
      const world = makeWorld(async (url) => {
        fetched.push(url);
        return "body";
      });

      await runIO(bind(fetchUrl("https://api.test/items"), pure), world);
      expect(fetched).toEqual(["https://api.test/items"]);
    });

    it("passes the response body to the continuation", async () => {
      const world = makeWorld(async () => "response-body");
      const result = await runIO(
        bind(fetchUrl("https://x.test"), (body) => pure(body)),
        world,
      );
      expect(result).toBe("response-body");
    });

    it("different URLs are passed to world.fetch as-is", async () => {
      const fetched: string[] = [];
      const world = makeWorld(async (url) => {
        fetched.push(url);
        return "";
      });

      const program = andThen(
        bind(fetchUrl("https://a.test"), pure),
        bind(fetchUrl("https://b.test"), pure),
      );

      await runIO(program, world);
      expect(fetched).toEqual(["https://a.test", "https://b.test"]);
    });

    it("fetch result can be combined with writeLine", async () => {
      const world = makeWorld(async () => "42 chars body");
      await runIO(
        bind(fetchUrl("https://x.test"), (body) => writeLine(`Got: ${body}`)),
        world,
      );
      expect(world.output).toEqual(["Got: 42 chars body"]);
    });
  });

  describe("fetchProgram", () => {
    it("writes 'Fetching data...' before the fetch", async () => {
      const log: string[] = [];
      const world = makeWorld(async () => {
        log.push("fetch");
        return "x";
      });

      world.writeLine = async (line) => {
        log.push(`write:${line}`);
      };

      await runIO(fetchProgram, world);
      expect(log[0]).toBe("write:Fetching data...");
    });

    it("output contains 'Fetching data...' as first line", async () => {
      const world = makeWorld(async () => "abc");
      await runIO(fetchProgram, world);
      expect(world.output[0]).toBe("Fetching data...");
    });

    it("reports character count in second line", async () => {
      const world = makeWorld(async () => "hello");
      await runIO(fetchProgram, world);
      expect(world.output[1]).toContain("5");
    });

    it("character count matches actual body length", async () => {
      const body = "x".repeat(17);
      const world = makeWorld(async () => body);
      await runIO(fetchProgram, world);
      expect(world.output[1]).toContain("17");
    });

    it("produces exactly 2 lines of output", async () => {
      const world = makeWorld(async () => "any");
      await runIO(fetchProgram, world);
      expect(world.output).toHaveLength(2);
    });
  });
});
