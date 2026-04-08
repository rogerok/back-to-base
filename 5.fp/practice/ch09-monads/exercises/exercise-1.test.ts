import { describe, expect, it } from "vitest";

import { Maybe } from "./containers.ts";
import { Box, divideAndDouble, flattenBox, unwrapNested } from "./exercise-1.ts";

describe("exercise-1.ts", () => {
  it("Box.join и Box.map", () => {
    expect(Box.of(42).join()).toBe(42);
    expect(Box.of(Box.of(42)).join()).toBeInstanceOf(Box);
    expect((Box.of(Box.of(42)).join() as Box<number>)._value).toBe(42);
    expect(Box.of("строка").join()).toBe("строка");
    expect(Box.of(5).map((x) => x * 2)._value).toBe(10);
  });

  it("flattenBox снимает двойную вложенность", () => {
    expect(flattenBox(Box.of(Box.of(Box.of(7))))._value).toBe(7);
    expect(flattenBox(Box.of(Box.of(Box.of("hello"))))._value).toBe("hello");
  });

  it("divideAndDouble использует map + join", () => {
    expect(divideAndDouble(10, 2)._value).toBe(10);
    expect(divideAndDouble(9, 3)._value).toBe(6);
    expect(divideAndDouble(5, 0)._value).toBeNull();
    expect(divideAndDouble(0, 4)._value).toBe(0);
  });

  it("unwrapNested работает как Maybe.join", () => {
    expect(unwrapNested(99)._value).toBe(Maybe.of(99)._value);
    expect(unwrapNested("привет")._value).toBe(Maybe.of("привет")._value);
    expect(unwrapNested(null).isNothing).toBe(true);
  });
});
