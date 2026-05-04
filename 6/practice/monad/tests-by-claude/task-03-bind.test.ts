import { describe, expect, it } from "vitest";
import { andThen, bind, fetchUrl, makeTestWorld, map, pure, readLine, runIO, writeLine } from "../index";

describe("E3.1: bind — composes IO instructions without executing effects", () => {
  it("bind(pure(a), f) is equivalent to f(a)", async () => {
    const world = makeTestWorld([], {});
    const result = await runIO(bind(pure(10), (x) => pure(x * 2)), world);
    expect(result).toBe(20);
  });

  it("bind does not call the continuation until the world provides a value", () => {
    // bind(pure(a), f) = f(a) immediately — that is correct for pure.
    // For effectful first args (readLine, writeLine), the continuation
    // is NOT called at tree-construction time, only when runIO interprets it.
    let called = false;
    bind(readLine, (_s) => {
      called = true;
      return pure("done");
    });
    expect(called).toBe(false);
  });

  it("bind(writeLine, ...) sequences write then continuation", async () => {
    const world = makeTestWorld([], {});
    await runIO(
      bind(writeLine("first"), () => writeLine("second")),
      world,
    );
    expect(world.output).toEqual(["first", "second"]);
  });

  it("bind(readLine, f) passes the read value to f", async () => {
    const world = makeTestWorld(["user-input"], {});
    const result = await runIO(bind(readLine, (s) => pure(s.toUpperCase())), world);
    expect(result).toBe("USER-INPUT");
  });

  it("bind(fetch, f) passes the response body to f", async () => {
    const world = makeTestWorld([], { "https://api.test": "body-content" });
    const result = await runIO(
      bind(fetchUrl("https://api.test"), (body) => pure(body.length)),
      world,
    );
    expect(result).toBe("body-content".length);
  });

  it("bind preserves left-to-right effect order", async () => {
    const world = makeTestWorld(["Alice"], {});
    await runIO(
      bind(writeLine("prompt"), () =>
        bind(readLine, (name) => writeLine(`got: ${name}`))),
      world,
    );
    expect(world.output).toEqual(["prompt", "got: Alice"]);
  });

  it("bind chains three effects correctly", async () => {
    const world = makeTestWorld(["name", "age"], {});
    await runIO(
      bind(readLine, (name) =>
        bind(readLine, (age) =>
          writeLine(`${name} is ${age}`))),
      world,
    );
    expect(world.output).toEqual(["name is age"]);
  });

  it("bind can return a different type (A → IO<B>)", async () => {
    const world = makeTestWorld([], {});
    const result = await runIO(
      bind(pure("hello"), (s) => pure(s.length)),
      world,
    );
    expect(typeof result).toBe("number");
    expect(result).toBe(5);
  });
});

describe("E3.2: map and andThen — derived from bind", () => {
  describe("map", () => {
    it("applies a pure function to the IO result", async () => {
      const world = makeTestWorld([], {});
      const result = await runIO(map(pure(5), (x) => x + 1), world);
      expect(result).toBe(6);
    });

    it("preserves effects, only transforms the value", async () => {
      const world = makeTestWorld([], {});
      const result = await runIO(map(writeLine("side-effect"), () => 42), world);
      expect(result).toBe(42);
      expect(world.output).toEqual(["side-effect"]);
    });

    it("map(readLine, f) transforms the read value", async () => {
      const world = makeTestWorld(["hello"], {});
      const result = await runIO(map(readLine, (s) => s.length), world);
      expect(result).toBe(5);
    });
  });

  describe("andThen (>>)", () => {
    it("runs both effects and returns the second result", async () => {
      const world = makeTestWorld([], {});
      const result = await runIO(andThen(writeLine("a"), pure(99)), world);
      expect(result).toBe(99);
      expect(world.output).toEqual(["a"]);
    });

    it("discards the result of the first IO", async () => {
      const world = makeTestWorld(["input"], {});
      // readLine result is discarded
      const result = await runIO(andThen(readLine, pure("ignored-read")), world);
      expect(result).toBe("ignored-read");
    });

    it("runs both effects in order", async () => {
      const world = makeTestWorld([], {});
      await runIO(andThen(writeLine("first"), writeLine("second")), world);
      expect(world.output).toEqual(["first", "second"]);
    });

    it("chains three actions with andThen", async () => {
      const world = makeTestWorld([], {});
      await runIO(
        andThen(andThen(writeLine("a"), writeLine("b")), writeLine("c")),
        world,
      );
      expect(world.output).toEqual(["a", "b", "c"]);
    });
  });
});
