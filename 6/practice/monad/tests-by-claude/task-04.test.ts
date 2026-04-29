import { describe, expect, it } from "vitest";

import { bind, pure, readLine, runIO, andThen, writeLine } from "../index";

const makeWorld = (inputs: string[] = []) => {
  const output: string[] = [];
  return {
    output,
    readLine: async () => {
      const value = inputs.shift();
      if (value === undefined) throw new Error("No mocked input left");
      return value;
    },
    writeLine: async (line: string) => {
      output.push(line);
    },
  };
};

describe("Task 04: runIO interpreter", () => {
  describe("pure", () => {
    it("resolves with the value inside pure", async () => {
      const world = makeWorld();
      await expect(runIO(pure(99), world)).resolves.toBe(99);
    });

    it("resolves with string", async () => {
      await expect(runIO(pure("hello"), makeWorld())).resolves.toBe("hello");
    });

    it("resolves with undefined", async () => {
      await expect(runIO(pure(undefined), makeWorld())).resolves.toBeUndefined();
    });

    it("does not call world.writeLine for pure", async () => {
      const world = makeWorld();
      await runIO(pure(1), world);
      expect(world.output).toHaveLength(0);
    });
  });

  describe("writeLine", () => {
    it("calls world.writeLine with the correct text", async () => {
      const world = makeWorld();
      await runIO(writeLine("hello"), world);
      expect(world.output).toEqual(["hello"]);
    });

    it("calls world.writeLine in order for chained writes", async () => {
      const world = makeWorld();
      const program = andThen(writeLine("first"), andThen(writeLine("second"), writeLine("third")));
      await runIO(program, world);
      expect(world.output).toEqual(["first", "second", "third"]);
    });

    it("resolves with undefined after writeLine", async () => {
      const world = makeWorld();
      await expect(runIO(writeLine("hi"), world)).resolves.toBeUndefined();
    });
  });

  describe("readLine", () => {
    it("calls world.readLine and passes the value to the continuation", async () => {
      const world = makeWorld(["test-input"]);
      const result = await runIO(bind(readLine, (s) => pure(s)), world);
      expect(result).toBe("test-input");
    });

    it("consumes inputs in order", async () => {
      const world = makeWorld(["first", "second"]);
      const program = bind(readLine, (a) => bind(readLine, (b) => pure([a, b])));
      const result = await runIO(program, world);
      expect(result).toEqual(["first", "second"]);
    });
  });

  describe("combined effects", () => {
    it("interleaves reads and writes in declaration order", async () => {
      const world = makeWorld(["Alice"]);
      const program = bind(
        readLine,
        (name) => andThen(writeLine(`Hello, ${name}!`), pure(name)),
      );

      const result = await runIO(program, world);
      expect(result).toBe("Alice");
      expect(world.output).toEqual(["Hello, Alice!"]);
    });

    it("write before read executes write first", async () => {
      const log: string[] = [];
      const world = {
        readLine: async () => {
          log.push("read");
          return "x";
        },
        writeLine: async (line: string) => {
          log.push(`write:${line}`);
        },
      };

      const program = andThen(writeLine("prompt"), bind(readLine, (s) => pure(s)));
      await runIO(program, world);

      expect(log[0]).toBe("write:prompt");
      expect(log[1]).toBe("read");
    });
  });
});
