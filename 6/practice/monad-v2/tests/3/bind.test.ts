import { describe, expect, it } from "vitest";

import { addThen, bind, map, pure, readLine, writeLine } from "../../index.ts";
// Minimal interpreter — independent of the student's runIO.
// Lets us test bind/map/addThen behaviour before Part 5.
function runSync<A>(io: unknown, inputs: string[]): { output: string[]; value: A } {
  const output: string[] = [];
  let current = io as any;
  for (;;) {
    switch (current.tag) {
      case "pure":
        return { output, value: current.value as A };
      case "fail":
        throw current.error;
      case "readLine": {
        const line = inputs.shift();
        if (line === undefined) throw new Error("No more input");
        current = current.next(line);
        break;
      }
      case "writeLine":
        output.push(current.text as string);
        current = current.next;
        break;
      default:
        throw new Error(`Unknown tag: ${String(current.tag)}`);
    }
  }
}

describe("E3.1 — bind", () => {
  it("bind(pure(a), f) = f(a)", () => {
    const result = bind(pure(42), (x) => pure(x + 1));
    expect(result.tag).toBe("pure");
    if (result.tag !== "pure") return;
    expect(result.value).toBe(43);
  });

  it("bind(writeLine(t), f) preserves the writeLine node", () => {
    const result = bind(writeLine("hello"), () => pure(1));
    expect(result.tag).toBe("writeLine");
    if (result.tag !== "writeLine") return;
    expect(result.text).toBe("hello");
  });

  it("bind(readLine, f) preserves the readLine node", () => {
    const result = bind(readLine, (s) => pure(s.length));
    expect(result.tag).toBe("readLine");
  });

  it("bind(readLine, f) passes the read value to f", () => {
    const program = bind(readLine, (name) => writeLine(`Hello, ${name}`));
    const { output } = runSync(program, ["Alice"]);
    expect(output).toEqual(["Hello, Alice"]);
  });

  it("chained bind propagates values through multiple steps", () => {
    const program = bind(readLine, (a) => bind(readLine, (b) => pure(`${a}+${b}`)));
    const { value } = runSync<string>(program, ["foo", "bar"]);
    expect(value).toBe("foo+bar");
  });

  it("bind after writeLine runs the continuation", () => {
    const program = bind(writeLine("first"), () => writeLine("second"));
    const { output } = runSync(program, []);
    expect(output).toEqual(["first", "second"]);
  });
});

describe("E3.2 — map", () => {
  it("map(pure(a), f) = pure(f(a))", () => {
    const result = map(pure(5), (x) => x * 2);
    expect(result.tag).toBe("pure");
    if (result.tag !== "pure") return;
    expect(result.value).toBe(10);
  });

  it("map does not execute effects, only transforms the value", () => {
    const program = map(readLine, (s) => s.toUpperCase());
    const { value } = runSync<string>(program, ["hello"]);
    expect(value).toBe("HELLO");
  });
});

describe("E3.2 — addThen", () => {
  it("addThen runs the first IO and discards its value", () => {
    const program = addThen(writeLine("first"), writeLine("second"));
    const { output } = runSync(program, []);
    expect(output).toEqual(["first", "second"]);
  });

  it("addThen(readLine, pure(42)) reads input and returns 42", () => {
    const program = addThen(readLine, pure(42));
    const { value } = runSync<number>(program, ["ignored"]);
    expect(value).toBe(42);
  });

  it("addThen result type is that of the second IO", () => {
    // Type check: addThen(IO<string>, IO<number>) : IO<number>
    const result: ReturnType<typeof pure<number>> = addThen(readLine, pure(99));
    const { value } = runSync<number>(result, ["anything"]);
    expect(value).toBe(99);
  });
});
