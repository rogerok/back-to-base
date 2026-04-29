import { describe, expect, it } from "vitest";

import { bind, myProgram, pure, readLine, runIO, testWorld, andThen, writeLine } from "../index";

describe("Task 05: testWorld", () => {
  describe("basic mechanics", () => {
    it("readLine returns inputs in FIFO order", async () => {
      const world = testWorld(["first", "second", "third"]);
      expect(await world.readLine()).toBe("first");
      expect(await world.readLine()).toBe("second");
      expect(await world.readLine()).toBe("third");
    });

    it("writeLine accumulates output in order", async () => {
      const world = testWorld([]);
      await world.writeLine("a");
      await world.writeLine("b");
      await world.writeLine("c");
      expect(world.output).toEqual(["a", "b", "c"]);
    });

    it("output starts empty", () => {
      const world = testWorld(["x"]);
      expect(world.output).toEqual([]);
    });

    it("throws when all inputs are consumed", async () => {
      const world = testWorld(["only-one"]);
      await world.readLine();
      await expect(world.readLine()).rejects.toThrow();
    });

    it("throws immediately when no inputs provided", async () => {
      const world = testWorld([]);
      await expect(world.readLine()).rejects.toThrow();
    });
  });

  describe("used with runIO", () => {
    it("captures output of a simple write program", async () => {
      const world = testWorld([]);
      await runIO(writeLine("hello"), world);
      expect(world.output).toEqual(["hello"]);
    });

    it("supplies inputs to readLine in program", async () => {
      const world = testWorld(["Alice"]);
      const result = await runIO(bind(readLine, (s) => pure(s)), world);
      expect(result).toBe("Alice");
    });

    it("captures multiple writes in correct order", async () => {
      const world = testWorld([]);
      const program = andThen(
        writeLine("line 1"),
        andThen(writeLine("line 2"), writeLine("line 3")),
      );
      await runIO(program, world);
      expect(world.output).toEqual(["line 1", "line 2", "line 3"]);
    });

    it("two independent testWorlds do not share state", async () => {
      const worldA = testWorld([]);
      const worldB = testWorld([]);
      await runIO(writeLine("from-a"), worldA);
      expect(worldA.output).toEqual(["from-a"]);
      expect(worldB.output).toEqual([]);
    });
  });

  describe("with myProgram", () => {
    it("runs myProgram with Alice and age 25", async () => {
      const world = testWorld(["Alice", "25"]);
      await runIO(myProgram, world);

      expect(world.output[0]).toContain("name");
      expect(world.output[1]).toContain("Alice");
      expect(world.output[2]).toContain("Alice");
      expect(world.output[2]).toContain("25");
    });

    it("produces the same number of output lines for different inputs", async () => {
      const worldA = testWorld(["Alice", "30"]);
      const worldB = testWorld(["Bob", "20"]);

      await runIO(myProgram, worldA);
      await runIO(myProgram, worldB);

      expect(worldA.output.length).toBe(worldB.output.length);
    });
  });
});
