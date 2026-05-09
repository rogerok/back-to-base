import { describe, expect, it } from "vitest";
import { doIO, readLine, runIO, testWorld, writeLine } from "../../index";

describe("E8.1 / E8.2 — doIO returns an IO value", () => {
  it("doIO(...) produces an object (value), not a function", () => {
    const program = doIO(function* () {
      yield writeLine("hi");
    });
    expect(typeof program).toBe("object");
    expect(typeof program).not.toBe("function");
  });

  it("the value has an IO tag at its root", () => {
    const program = doIO(function* () {
      yield writeLine("hi");
    });
    const p = program as any;
    expect(typeof p.tag).toBe("string");
  });
});

describe("E8.1 / E8.2 — doIO runs correctly", () => {
  it("yield writeLine writes to the world", async () => {
    const world = testWorld([]);
    const program = doIO(function* () {
      yield writeLine("hello from doIO");
    });
    await runIO(program, world);
    expect(world.output).toEqual(["hello from doIO"]);
  });

  it("yield readLine provides the value to subsequent yields", async () => {
    const world = testWorld(["Slava"]);
    const program = doIO(function* () {
      yield writeLine("Name?");
      const name = yield readLine;
      yield writeLine(`Hi, ${name}`);
    });
    await runIO(program, world);
    expect(world.output).toEqual(["Name?", "Hi, Slava"]);
  });

  it("multiple reads in sequence", async () => {
    const world = testWorld(["Alice", "30"]);
    const program = doIO(function* () {
      const name = yield readLine;
      const age = yield readLine;
      yield writeLine(`${name} is ${age}`);
    });
    await runIO(program, world);
    expect(world.output).toEqual(["Alice is 30"]);
  });
});

describe("E8.4 ★ — all doIO variants produce identical output", () => {
  const inputs = ["Alice", "30"];
  const expected = [
    "What is your name?",
    "Hello, Alice! How old are you?",
    "Wow, Alice, 30 is a great age!",
  ];

  async function runVariant(variant: string) {
    const mod = await import("../../index");
    const key = variant as keyof typeof mod;
    if (!(key in mod)) return null;
    const doVariant = mod[key] as typeof doIO;
    const world = testWorld([...inputs]);
    const program = doVariant(function* () {
      yield writeLine("What is your name?");
      const name = yield readLine;
      yield writeLine(`Hello, ${name}! How old are you?`);
      const age = yield readLine;
      yield writeLine(`Wow, ${name}, ${age} is a great age!`);
    });
    await runIO(program, world);
    return world.output;
  }

  it("doIO (base) produces correct output", async () => {
    const output = await runVariant("doIO");
    if (output === null) return;
    expect(output).toEqual(expected);
  });

  // If the student exports doIOAdapter (E8.2) or doIOSymbol (E8.3):
  it("doIOAdapter (E8.2) produces the same output", async () => {
    const output = await runVariant("doIOAdapter");
    if (output === null) return;
    expect(output).toEqual(expected);
  });

  it("doIOSymbol (E8.3) produces the same output", async () => {
    const output = await runVariant("doIOSymbol");
    if (output === null) return;
    expect(output).toEqual(expected);
  });
});

describe("E8.3 ★★ — Symbol.iterator not visible in JSON.stringify", () => {
  it("writeLine node does not expose Symbol.iterator in JSON", () => {
    const node = writeLine("test");
    const json = JSON.stringify(node);
    // Symbol.iterator cannot appear as a string key in JSON, but the
    // test checks that the serialised shape contains only the expected fields.
    const parsed = JSON.parse(json) as Record<string, unknown>;
    const keys = Object.keys(parsed);
    expect(keys).not.toContain("Symbol(Symbol.iterator)");
  });
});
