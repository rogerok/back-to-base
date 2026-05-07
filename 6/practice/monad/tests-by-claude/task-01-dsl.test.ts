import { describe, expect, it } from "vitest";

import { bind, pure, readLine, runIO, writeLine } from "../script";
import { Freer, Instr } from "../script/types.ts";
import { makeTestWorld } from "../script/worlds.ts";

describe("E10.1: Freer<Instr, A> — tagged union with correct shapes", () => {
  it("pure has tag 'pure' and stores the value", () => {
    const io: Freer<Instr<any>, number> = pure(42);
    expect(io.tag).toBe("pure");
    expect((io as any).value).toBe(42);
  });

  it("effectful constructors produce 'impure' nodes", () => {
    expect(writeLine("x").tag).toBe("impure");
    expect(readLine.tag).toBe("impure");
  });

  it("impure nodes carry an op with the instruction's tag", () => {
    expect((writeLine("x") as any).op?.tag).toBe("writeLine");
    expect((readLine as any).op?.tag).toBe("readLine");
  });

  it("all smart constructors return Freer values with a tag", () => {
    const values = [pure("x"), readLine, writeLine("t")];
    for (const v of values) {
      expect(v).toHaveProperty("tag");
    }
  });
});

describe("E10.1: Freer program is pure data — no side effects at build time", () => {
  it("constructing a Freer program fires no continuations", () => {
    let effectFired = false;

    bind(writeLine("prompt"), () =>
      bind(readLine, (name) => {
        effectFired = true;
        return writeLine(`Hello, ${name}!`);
      }),
    );

    expect(effectFired).toBe(false);
  });

  it("program built with smart constructors produces correct output when interpreted", async () => {
    const greeting = bind(writeLine("What is your name?"), () =>
      bind(readLine, (name) => writeLine(`Hello, ${name}!`)),
    );

    const world = makeTestWorld(["Alice"], {});
    await runIO(greeting, world);
    expect(world.output).toEqual(["What is your name?", "Hello, Alice!"]);
  });

  it("the same program value can be run multiple times with different worlds", async () => {
    const greeting = bind(writeLine("What is your name?"), () =>
      bind(readLine, (name) => writeLine(`Hello, ${name}!`)),
    );

    const world1 = makeTestWorld(["Alice"], {});
    const world2 = makeTestWorld(["Bob"], {});
    await runIO(greeting, world1);
    await runIO(greeting, world2);

    expect(world1.output[1]).toBe("Hello, Alice!");
    expect(world2.output[1]).toBe("Hello, Bob!");
  });
});
