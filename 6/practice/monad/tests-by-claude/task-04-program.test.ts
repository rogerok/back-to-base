import { describe, expect, it } from "vitest";
import { andThen, bind, makeTestWorld, pure, readLine, runIO, sequence, writeLine } from "../index";

// Equivalent to the myProgram from the assignment (not exported, rebuilt here)
const makeMyProgram = () =>
  bind(writeLine("What is your name?"), () =>
    bind(readLine, (name) =>
      bind(writeLine(`Hello, ${name}! How old are you?`), () =>
        bind(readLine, (age) =>
          writeLine(`Wow, ${name}, ${age} is a great age!`)))));

describe("E4.1: a complete multi-step IO program", () => {
  it("is a value — building the program fires no effects", () => {
    let fired = false;
    bind(writeLine("prompt"), () =>
      bind(readLine, (name) => {
        fired = true;
        return writeLine(`Hello, ${name}!`);
      }));
    expect(fired).toBe(false);
  });

  it("produces correct output for the name+age program", async () => {
    const program = makeMyProgram();
    const world = makeTestWorld(["Alice", "30"], {});
    await runIO(program, world);

    expect(world.output).toEqual([
      "What is your name?",
      "Hello, Alice! How old are you?",
      "Wow, Alice, 30 is a great age!",
    ]);
  });

  it("the program closes over both name and age in the final writeLine", async () => {
    const program = makeMyProgram();
    const world = makeTestWorld(["Bob", "25"], {});
    await runIO(program, world);

    expect(world.output[2]).toContain("Bob");
    expect(world.output[2]).toContain("25");
  });

  it("same program value runs correctly with different inputs", async () => {
    const program = makeMyProgram();

    const world1 = makeTestWorld(["Alice", "30"], {});
    await runIO(program, world1);

    const world2 = makeTestWorld(["Bob", "42"], {});
    await runIO(program, world2);

    expect(world1.output[2]).toContain("Alice");
    expect(world2.output[2]).toContain("Bob");
  });

  it("program is typed IO<void> — resolves to undefined", async () => {
    const program = makeMyProgram();
    const world = makeTestWorld(["X", "1"], {});
    const result = await runIO(program, world);
    expect(result).toBeUndefined();
  });
});

describe("E4.2★: sequence — runs a list of IO actions, collects results", () => {
  it("sequence([]) resolves to an empty array with no effects", async () => {
    const world = makeTestWorld([], {});
    const result = await runIO(sequence([]), world);
    expect(result).toEqual([]);
    expect(world.output).toEqual([]);
  });

  it("sequence([pure(1), pure(2), pure(3)]) resolves to [1, 2, 3]", async () => {
    const world = makeTestWorld([], {});
    const result = await runIO(sequence([pure(1), pure(2), pure(3)]), world);
    expect(result).toEqual([1, 2, 3]);
  });

  it("sequence runs effects in order and collects all results", async () => {
    const world = makeTestWorld([], {});
    const result = await runIO(
      sequence([
        andThen(writeLine("one"), pure(1)),
        andThen(writeLine("two"), pure(2)),
        andThen(writeLine("three"), pure(3)),
      ]),
      world,
    );
    expect(result).toEqual([1, 2, 3]);
    expect(world.output).toEqual(["one", "two", "three"]);
  });

  it("sequence preserves the order of effects and results", async () => {
    const world = makeTestWorld([], {});
    const items = ["a", "b", "c", "d", "e"];
    const actions = items.map((s) => andThen(writeLine(s), pure(s)));
    const result = await runIO(sequence(actions), world);

    expect(result).toEqual(items);
    expect(world.output).toEqual(items);
  });

  it("sequence with readLines reads in FIFO order", async () => {
    const world = makeTestWorld(["x", "y", "z"], {});
    const result = await runIO(sequence([readLine, readLine, readLine]), world);
    expect(result).toEqual(["x", "y", "z"]);
  });
});
