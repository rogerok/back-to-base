// E10.1–E10.3★★: Freer encoding — decoupled IO, bind, and instructions
//
// Will fail to import until E10.1 is implemented.
// E10.1 goal: myProgram (business logic) runs unchanged; only the underlying
//             type changes from IO<A> to Freer<Instr, A>.
//
// Key invariant: if the smart constructors (pure, readLine, writeLine, fetchUrl)
// remain the same API, ALL existing tests in task-01 through task-08 should
// pass WITHOUT modification — only this file tests Freer-specific properties.

import { describe, expect, it } from "vitest";
import {
  bind,
  fetchUrl,
  makeTestWorld,
  pure,
  readLine,
  runIO,
  writeLine,
} from "../index";

// ── E10.1: Freer encoding preserves all existing behavioral contracts ──────

describe("E10.1: Freer encoding — existing programs run identically", () => {
  it("pure(a) still resolves to a", async () => {
    const world = makeTestWorld([], {});
    expect(await runIO(pure(42), world)).toBe(42);
  });

  it("writeLine still produces output", async () => {
    const world = makeTestWorld([], {});
    await runIO(writeLine("hello freer"), world);
    expect(world.output).toEqual(["hello freer"]);
  });

  it("readLine still reads from world", async () => {
    const world = makeTestWorld(["freer-input"], {});
    const result = await runIO(bind(readLine, pure), world);
    expect(result).toBe("freer-input");
  });

  it("fetchUrl still calls world.fetch", async () => {
    const world = makeTestWorld([], { "https://api.test": "freer-body" });
    const result = await runIO(bind(fetchUrl("https://api.test"), pure), world);
    expect(result).toBe("freer-body");
  });

  it("full name+age program produces the same output as before Freer", async () => {
    const program = bind(writeLine("What is your name?"), () =>
      bind(readLine, (name) =>
        bind(writeLine(`Hello, ${name}! How old are you?`), () =>
          bind(readLine, (age) =>
            writeLine(`Wow, ${name}, ${age} is a great age!`)))));

    const world = makeTestWorld(["Alice", "30"], {});
    await runIO(program, world);
    expect(world.output).toEqual([
      "What is your name?",
      "Hello, Alice! How old are you?",
      "Wow, Alice, 30 is a great age!",
    ]);
  });

  it("bind does not call continuation for non-pure instructions", () => {
    let called = false;
    bind(readLine, () => {
      called = true;
      return pure("x");
    });
    expect(called).toBe(false);
  });
});

// ── E10.2★: Random — new effect added WITHOUT touching bind or Freer ──────

describe("E10.2★: Random effect — extensible without modifying bind", () => {
  // Will fail until `random` constructor is exported from index.ts
  // and World interface includes `random: () => Promise<number>`

  it.todo("random() has tag 'random'");
  it.todo("runIO(random(), world) calls world.random()");
  it.todo("random result is in [0, 1)");
  it.todo("adding random did not require changes to bind implementation");

  it.todo(`program using random produces different greetings
    const program = doIO(function* () {
      const idx = Math.floor((yield* random()) * greetings.length);
      yield* writeLine(greetings[idx]);
    });`);
});

// ── E10.3★★: runWithLogging — multiple interpreters for same Freer program ─

describe("E10.3★★: runWithLogging — second interpreter without touching bind", () => {
  // Will fail until runWithLogging is exported from index.ts.
  // runWithLogging should print each instruction tag before delegating to runIO.

  it.todo("runWithLogging(program, world) produces the same output as runIO(program, world)");
  it.todo("runWithLogging logs each instruction tag before executing it");
  it.todo("adding runWithLogging required no changes to bind or Freer type");
  it.todo("the same program value works in both runIO and runWithLogging");
});
