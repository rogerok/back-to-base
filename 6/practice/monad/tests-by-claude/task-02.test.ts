import { bind, map, pure, readLine, andThen, writeLine } from "../index";

describe("Task 02: bind, map, andThen", () => {
  describe("bind — monad laws", () => {
    // Monad law 1: left identity — bind(pure(a), f) = f(a)
    it("left identity: bind(pure(a), f) equals f(a)", () => {
      const f = (x: number) => pure(x * 2);
      expect(bind(pure(5), f)).toEqual(f(5));
    });

    // Monad law 2: right identity — bind(m, pure) = m
    it("right identity: bind(m, pure) equals m for pure", () => {
      expect(bind(pure(7), pure)).toEqual(pure(7));
    });

    it("right identity: bind(writeLine, pure) preserves writeLine structure", () => {
      const m = writeLine("hi");
      expect(bind(m, pure)).toMatchObject({ tag: "writeLine", text: "hi" });
    });

    // Monad law 3: associativity — bind(bind(m, f), g) = bind(m, x => bind(f(x), g))
    it("associativity: chaining bind is equivalent to nesting bind", () => {
      const f = (x: number) => pure(x + 1);
      const g = (x: number) => pure(x * 2);

      const left = bind(bind(pure(3), f), g);
      const right = bind(pure(3), (x) => bind(f(x), g));

      expect(left).toEqual(right);
    });
  });

  describe("bind — structural behaviour", () => {
    it("returns the continuation result when applied to pure", () => {
      expect(bind(pure("a"), (s) => pure(s + "b"))).toEqual(pure("ab"));
    });

    it("chains two writeLines in order", () => {
      const program = bind(writeLine("first"), () => writeLine("second"));

      if (program.tag !== "writeLine") throw new Error("unexpected tag");

      expect(program.text).toBe("first");
      expect(program.next).toMatchObject({ tag: "writeLine", text: "second" });
    });

    it("chains three writeLines in order", () => {
      const program = bind(writeLine("a"), () => bind(writeLine("b"), () => writeLine("c")));

      if (program.tag !== "writeLine") throw new Error("unexpected tag");
      expect(program.text).toBe("a");

      if (program.next.tag !== "writeLine") throw new Error("unexpected tag");
      expect(program.next.text).toBe("b");

      if (program.next.next.tag !== "writeLine") throw new Error("unexpected tag");
      expect(program.next.next.text).toBe("c");
    });

    it("readLine root is preserved after bind", () => {
      const program = bind(readLine, (s) => pure(s.length));
      expect(program.tag).toBe("readLine");
    });

    it("readLine continuation gets the bound transformation", () => {
      const program = bind(readLine, (s) => pure(s.toUpperCase()));

      if (program.tag !== "readLine") throw new Error("unexpected tag");
      expect(program.next("hello")).toEqual(pure("HELLO"));
    });

    it("bind over readLine does not call f before the line is read", () => {
      let called = false;
      bind(readLine, () => {
        called = true;
        return pure(undefined);
      });
      expect(called).toBe(false);
    });
  });

  describe("map", () => {
    it("transforms value inside pure", () => {
      expect(map(pure(10), (x) => x * 3)).toEqual(pure(30));
    });

    it("works with string transformation", () => {
      expect(map(pure("hello"), (s) => s.length)).toEqual(pure(5));
    });

    it("result is still IO — not a plain value", () => {
      const result = map(pure(1), (x) => x + 1);
      expect(result).toMatchObject({ tag: "pure" });
    });

    it("preserves writeLine tag and text", () => {
      const result = map(writeLine("hi"), () => 42);
      expect(result).toMatchObject({ tag: "writeLine", text: "hi" });
    });

    it("map(io, identity) equals io for pure", () => {
      expect(map(pure(5), (x) => x)).toEqual(pure(5));
    });

    it("map does not double-wrap — result is IO<B>, not IO<IO<B>>", () => {
      const result = map(pure(1), (x) => x + 1);
      expect((result as any).value?.tag).toBeUndefined();
    });
  });

  describe("andThen", () => {
    it("result starts with the first program", () => {
      const program = andThen(writeLine("a"), writeLine("b"));
      expect(program).toMatchObject({ tag: "writeLine", text: "a" });
    });

    it("second program follows the first", () => {
      const program = andThen(writeLine("a"), writeLine("b"));

      if (program.tag !== "writeLine") throw new Error("unexpected tag");
      expect(program.next).toMatchObject({ tag: "writeLine", text: "b" });
    });

    it("discards the value of the first program", () => {
      const program = andThen(pure(999), pure(42));
      expect(program).toEqual(pure(42));
    });

    it("andThen(a, b) is equivalent to bind(a, () => b)", () => {
      const viaThen = andThen(writeLine("x"), writeLine("y"));
      const viaBind = bind(writeLine("x"), () => writeLine("y"));
      expect(viaThen).toEqual(viaBind);
    });
  });
});
