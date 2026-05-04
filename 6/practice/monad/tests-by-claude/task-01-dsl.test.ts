import { describe, expect, it } from "vitest";
import type { Fetch, IO, IOPure, IOReadLine, IOWriteLine } from "../index";
import { makeTestWorld, runIO } from "../index";

describe("E1.1: IO<A> — tagged union with correct shapes", () => {
  it("IOPure has tag 'pure' and value", () => {
    const io: IOPure<number> = { tag: "pure", value: 42 };
    expect(io.tag).toBe("pure");
    expect(io.value).toBe(42);
  });

  it("IOReadLine has tag 'readLine' and next: (string) => IO<A>", () => {
    const io: IOReadLine<string> = {
      next: (s) => ({ tag: "pure", value: s }),
      tag: "readLine",
    };
    expect(io.tag).toBe("readLine");
    expect(typeof io.next).toBe("function");
  });

  it("IOWriteLine has tag 'writeLine', text, and next: IO<A> (not a function)", () => {
    const io: IOWriteLine<void> = {
      next: { tag: "pure", value: undefined },
      tag: "writeLine",
      text: "hello",
    };
    expect(io.tag).toBe("writeLine");
    expect(io.text).toBe("hello");
    expect(typeof io.next).toBe("object");
  });

  it("Fetch has tag 'fetch', url, and next: (string) => IO<A>", () => {
    const io: Fetch<string> = {
      next: (body) => ({ tag: "pure", value: body }),
      tag: "fetch",
      url: "https://example.com",
    };
    expect(io.tag).toBe("fetch");
    expect(io.url).toBe("https://example.com");
    expect(typeof io.next).toBe("function");
  });

  it("all variants are assignable to IO<A>", () => {
    const variants: IO<string>[] = [
      { tag: "pure", value: "x" },
      { next: (s) => ({ tag: "pure", value: s }), tag: "readLine" },
      { next: { tag: "pure", value: "x" }, tag: "writeLine", text: "t" },
      { next: (b) => ({ tag: "pure", value: b }), tag: "fetch", url: "http://x" },
    ];
    expect(variants).toHaveLength(4);
    for (const v of variants) {
      expect(v).toHaveProperty("tag");
    }
  });
});

describe("E1.2: greeting — IO<void> is pure data, has no side effects at build time", () => {
  it("constructing the tree does not fire any continuations", () => {
    let effectFired = false;

    const _greeting: IO<void> = {
      next: {
        next: (name) => {
          effectFired = true; // would fire if IO were evaluated eagerly
          return {
            next: { tag: "pure", value: undefined },
            tag: "writeLine",
            text: `Hello, ${name}!`,
          };
        },
        tag: "readLine",
      },
      tag: "writeLine",
      text: "What is your name?",
    };

    expect(effectFired).toBe(false);
  });

  it("manually-built greeting tree produces correct output when interpreted", async () => {
    const greeting: IO<void> = {
      next: {
        next: (name) => ({
          next: { tag: "pure", value: undefined },
          tag: "writeLine",
          text: `Hello, ${name}!`,
        }),
        tag: "readLine",
      },
      tag: "writeLine",
      text: "What is your name?",
    };

    const world = makeTestWorld(["Alice"], {});
    await runIO(greeting, world);
    expect(world.output).toEqual(["What is your name?", "Hello, Alice!"]);
  });

  it("the same tree can be run multiple times with different worlds", async () => {
    const greeting: IO<void> = {
      next: {
        next: (name) => ({
          next: { tag: "pure", value: undefined },
          tag: "writeLine",
          text: `Hello, ${name}!`,
        }),
        tag: "readLine",
      },
      tag: "writeLine",
      text: "What is your name?",
    };

    const world1 = makeTestWorld(["Alice"], {});
    const world2 = makeTestWorld(["Bob"], {});
    await runIO(greeting, world1);
    await runIO(greeting, world2);

    expect(world1.output[1]).toBe("Hello, Alice!");
    expect(world2.output[1]).toBe("Hello, Bob!");
  });
});
