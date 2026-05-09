import { describe, expect, it } from "vitest";
import { myProgram, pure, sequence } from "../../index";

// Inline interpreter — identical approach as tests/3, before runIO is ready.
function runSync<A>(io: unknown, inputs: string[]): { value: A; output: string[] } {
  const output: string[] = [];
  let current = io as any;
  for (;;) {
    switch (current.tag) {
      case "pure":
        return { value: current.value as A, output };
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

describe("E4.1 — myProgram", () => {
  it("is a value (object), not a function", () => {
    expect(typeof myProgram).toBe("object");
    expect(typeof myProgram).not.toBe("function");
  });

  it("starts by printing the name prompt", () => {
    const { output } = runSync(myProgram, ["Alice", "30"]);
    expect(output[0]).toBe("What is your name?");
  });

  it("greets by name and asks for age", () => {
    const { output } = runSync(myProgram, ["Alice", "30"]);
    expect(output[1]).toBe("Hello, Alice! How old are you?");
  });

  it("prints the final message with both name and age", () => {
    const { output } = runSync(myProgram, ["Bob", "25"]);
    expect(output[2]).toBe("Wow, Bob, 25 is a great age!");
  });

  it("produces exactly 3 output lines", () => {
    const { output } = runSync(myProgram, ["Alice", "30"]);
    expect(output).toHaveLength(3);
  });

  it("consumes exactly 2 inputs", () => {
    const inputs = ["Alice", "30", "extra"];
    runSync(myProgram, inputs);
    expect(inputs).toEqual(["extra"]);
  });
});

describe("E4.2 ★ — sequence", () => {
  it("sequence([]) = pure([])", () => {
    const result = sequence<number>([]);
    const { value } = runSync<number[]>(result, []);
    expect(value).toEqual([]);
  });

  it("sequence([pure(1), pure(2)]) = pure([1, 2])", () => {
    const result = sequence([pure(1), pure(2), pure(3)]);
    const { value } = runSync<number[]>(result, []);
    expect(value).toEqual([1, 2, 3]);
  });

  it("sequence preserves order", () => {
    const result = sequence([pure("a"), pure("b"), pure("c")]);
    const { value } = runSync<string[]>(result, []);
    expect(value).toEqual(["a", "b", "c"]);
  });
});
