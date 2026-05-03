import { describe, expect, expectTypeOf, it } from "vitest";

import { pure, sequence, writeLine } from "../index";

describe("Task 04.2: sequence", () => {
  it("has type Array<IO<A>> -> IO<Array<A>>", () => {
    const program = sequence([pure(1), pure(2), pure(3)]);

    expectTypeOf(program).toEqualTypeOf<ReturnType<typeof pure<number[]>>>();
  });

  it("returns pure([]) for an empty list", () => {
    expect(sequence([])).toEqual(pure([]));
  });

  it("collects pure values in the same order", () => {
    expect(sequence([pure("a"), pure("b"), pure("c")])).toEqual(pure(["a", "b", "c"]));
  });

  it("keeps the first effect at the root for non-empty effectful input", () => {
    const program = sequence([writeLine("first"), writeLine("second")]);

    expect(program).toMatchObject({
      tag: "writeLine",
      text: "first",
    });
  });
});
