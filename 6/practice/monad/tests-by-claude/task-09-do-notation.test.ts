// E8.1, E8.2, E8.3★★, E8.4★: Do-notation through generators
//
// Will fail to import until `doIO` is exported from index.ts.
//
// NOTE: E8.1 (naive) uses `yield io` syntax.
//       E8.3 (Symbol.iterator) uses `yield* io` syntax.
//       These require DIFFERENT doIO implementations — they are NOT interchangeable.
//       Tests below target the FINAL E8.3 implementation (yield* io).
//       When you finish E8.1, you can temporarily swap to yield-style programs to verify.

import { describe, expect, it } from "vitest";
import { bind, doIO, fetchUrl, makeTestWorld, pure, readLine, runIO, writeLine } from "../index";

describe("E8.1: doIO — basic contract (naive yield implementation)", () => {
  it("doIO(fn) returns an IO value, not a function or thunk", () => {
    const io = doIO(function* () {
      yield writeLine("x");
    });
    expect(typeof io).toBe("object");
    expect(io).not.toBeNull();
    expect(typeof io).not.toBe("function");
  });

  it("doIO result has a tag (is a proper IO node)", () => {
    const io = doIO(function* () {
      yield writeLine("x");
    });
    expect(io).toHaveProperty("tag");
  });

  it("constructing doIO program has no side effects", () => {
    let called = false;
    doIO(function* () {
      called = true;
      yield writeLine("oops");
    });
    // The generator body should not execute at construction time
    expect(called).toBe(false);
  });
});

describe("E8.3★★: doIO — Symbol.iterator implementation (yield* io style)", () => {
  it("yield* writeLine produces output", async () => {
    const program = doIO(function* () {
      yield* writeLine("hello from doIO");
    });

    const world = makeTestWorld([], {});
    await runIO(program, world);
    expect(world.output).toEqual(["hello from doIO"]);
  });

  it("yield* readLine captures the input value", async () => {
    const program = doIO(function* () {
      const name = yield* readLine;
      yield* writeLine(`Got: ${name}`);
    });

    const world = makeTestWorld(["Alice"], {});
    await runIO(program, world);
    expect(world.output).toEqual(["Got: Alice"]);
  });

  it("multiple yield* execute top-to-bottom", async () => {
    const program = doIO(function* () {
      yield* writeLine("one");
      yield* writeLine("two");
      yield* writeLine("three");
    });

    const world = makeTestWorld([], {});
    await runIO(program, world);
    expect(world.output).toEqual(["one", "two", "three"]);
  });

  it("full name+age program via doIO produces correct output", async () => {
    const program = doIO(function* () {
      yield* writeLine("What is your name?");
      const name = yield* readLine;
      yield* writeLine(`Hello, ${name}! How old are you?`);
      const age = yield* readLine;
      yield* writeLine(`Wow, ${name}, ${age} is a great age!`);
    });

    const world = makeTestWorld(["Alice", "30"], {});
    await runIO(program, world);
    expect(world.output).toEqual([
      "What is your name?",
      "Hello, Alice! How old are you?",
      "Wow, Alice, 30 is a great age!",
    ]);
  });

  it("doIO with fetch works correctly", async () => {
    const program = doIO(function* () {
      yield* writeLine("Loading...");
      const body = yield* fetchUrl("https://api.test");
      yield* writeLine(`Got: ${body}`);
    });

    const world = makeTestWorld([], { "https://api.test": "response" });
    await runIO(program, world);
    expect(world.output).toEqual(["Loading...", "Got: response"]);
  });

  it("return value from generator is the IO result", async () => {
    const program = doIO(function* () {
      const name = yield* readLine;
      return name.toUpperCase();
    });

    const world = makeTestWorld(["alice"], {});
    const result = await runIO(program, world);
    expect(result).toBe("ALICE");
  });

  it("doIO program is reusable across multiple worlds", async () => {
    const program = doIO(function* () {
      const name = yield* readLine;
      yield* writeLine(`Hello, ${name}!`);
    });

    const w1 = makeTestWorld(["Alice"], {});
    const w2 = makeTestWorld(["Bob"], {});
    await runIO(program, w1);
    await runIO(program, w2);

    expect(w1.output).toEqual(["Hello, Alice!"]);
    expect(w2.output).toEqual(["Hello, Bob!"]);
  });
});

describe("E8.4★: doIO output is equivalent to bind-based program", () => {
  it("doIO program and bind program produce identical output", async () => {
    // bind-based (reference)
    const bindProgram = bind(writeLine("Name?"), () =>
      bind(readLine, (name) => writeLine(`Hi, ${name}!`)));

    // doIO-based (same logic)
    const doProgram = doIO(function* () {
      yield* writeLine("Name?");
      const name = yield* readLine;
      yield* writeLine(`Hi, ${name}!`);
    });

    const w1 = makeTestWorld(["Alice"], {});
    const w2 = makeTestWorld(["Alice"], {});
    await runIO(bindProgram, w1);
    await runIO(doProgram, w2);

    expect(w1.output).toEqual(w2.output);
  });

  it("doIO with multiple reads/writes matches bind chain exactly", async () => {
    const inputs = ["Alice", "30"];
    const fetchMock = { "https://api.test": "token-xyz" };

    const bindProgram = bind(writeLine("Name?"), () =>
      bind(readLine, (name) =>
        bind(writeLine("Age?"), () =>
          bind(readLine, (age) =>
            bind(fetchUrl("https://api.test"), (body) =>
              writeLine(`${name}, ${age}, ${body}`))))));

    const doProgram = doIO(function* () {
      yield* writeLine("Name?");
      const name = yield* readLine;
      yield* writeLine("Age?");
      const age = yield* readLine;
      const body = yield* fetchUrl("https://api.test");
      yield* writeLine(`${name}, ${age}, ${body}`);
    });

    const w1 = makeTestWorld([...inputs], fetchMock);
    const w2 = makeTestWorld([...inputs], fetchMock);
    await runIO(bindProgram, w1);
    await runIO(doProgram, w2);

    expect(w1.output).toEqual(w2.output);
  });
});
