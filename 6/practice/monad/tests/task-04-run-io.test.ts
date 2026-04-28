import { describe, expect, it } from "vitest";

import { bind, pure, readLine, runIO, then, writeLine } from "../index";

describe("Task 04: runIO interpreter", () => {
  it("returns the value from pure", async () => {
    await expect(
      runIO(pure(42), {
        readLine: async () => "unused",
        writeLine: async () => undefined,
      }),
    ).resolves.toBe(42);
  });

  it("executes read and write effects through the supplied world", async () => {
    const input = ["Alice"];
    const output: string[] = [];
    const program = bind(readLine, (name) => then(writeLine(`Hello, ${name}!`), pure(name.length)));

    const result = await runIO(program, {
      readLine: async () => {
        const value = input.shift();

        if (value === undefined) {
          throw new Error("No mocked input left");
        }

        return value;
      },
      writeLine: async (line) => {
        output.push(line);
      },
    });

    expect(result).toBe(5);
    expect(output).toEqual(["Hello, Alice!"]);
  });
});
