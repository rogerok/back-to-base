import { describe, expect, it } from "vitest";
import { bind, pure, readLine, runIO, writeLine } from "../../index";

// Inline world — not the student's testWorld, to keep Part 5 tests self-contained.
function makeWorld(inputs: string[]) {
  const output: string[] = [];
  return {
    output,
    world: {
      readLine: async () => {
        const line = inputs.shift();
        if (line === undefined) throw new Error("No more input");
        return line;
      },
      writeLine: async (s: string) => {
        output.push(s);
      },
    },
  };
}

describe("E5.1 — runIO", () => {
  it("pure(a) resolves with a", async () => {
    const { world } = makeWorld([]);
    const result = await runIO(pure(42), world);
    expect(result).toBe(42);
  });

  it("writeLine sends text to the world", async () => {
    const { world, output } = makeWorld([]);
    await runIO(writeLine("hello"), world);
    expect(output).toEqual(["hello"]);
  });

  it("readLine reads from the world", async () => {
    const { world } = makeWorld(["Alice"]);
    const program = bind(readLine, (s) => pure(s));
    const result = await runIO(program, world);
    expect(result).toBe("Alice");
  });

  it("multiple writes appear in order", async () => {
    const { world, output } = makeWorld([]);
    const program = bind(writeLine("first"), () => writeLine("second"));
    await runIO(program, world);
    expect(output).toEqual(["first", "second"]);
  });

  it("read-then-write echoes the input", async () => {
    const { world, output } = makeWorld(["echo me"]);
    const program = bind(readLine, (s) => writeLine(s));
    await runIO(program, world);
    expect(output).toEqual(["echo me"]);
  });

  it("runIO does not execute effects before being called", () => {
    const { world, output } = makeWorld([]);
    // Building the program must not trigger effects
    const _program = bind(writeLine("side-effect!"), () => pure(undefined));
    expect(output).toEqual([]);
    void world; // silence unused warning
  });
});

describe("E5.2 — what happens without assigning next (conceptual)", () => {
  it("a correct runIO advances through a 3-step program", async () => {
    const { world, output } = makeWorld(["Alice"]);
    const program = bind(writeLine("Name?"), () =>
      bind(readLine, (name) => writeLine(`Hi, ${name}`)),
    );
    await runIO(program, world);
    expect(output).toEqual(["Name?", "Hi, Alice"]);
  });
});
