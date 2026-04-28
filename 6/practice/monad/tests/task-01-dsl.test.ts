import { describe, expect, it } from "vitest";

import { greeting, pure, readLine, writeLine } from "../index";

describe("Task 01: IO DSL and smart constructors", () => {
  it("pure builds a pure IO value", () => {
    expect(pure(42)).toEqual({ tag: "pure", value: 42 });
  });

  it("readLine is an IO value, not a thunk", () => {
    expect(typeof readLine).not.toBe("function");
    expect(readLine.tag).toBe("readLine");
    expect(typeof readLine.next).toBe("function");
  });

  it("writeLine builds the minimal write instruction", () => {
    expect(writeLine("hello")).toEqual({
      next: { tag: "pure", value: undefined },
      tag: "writeLine",
      text: "hello",
    });
  });

  it("greeting is plain tagged data until a read continuation is selected", () => {
    expect(typeof greeting).not.toBe("function");
    expect(greeting).toMatchObject({
      tag: "writeLine",
      text: "What is your name?",
    });

    if (greeting.tag !== "writeLine") {
      throw new Error("Expected greeting to start with writeLine");
    }

    expect(greeting.next.tag).toBe("readLine");

    if (greeting.next.tag !== "readLine") {
      throw new Error("Expected greeting to continue with readLine");
    }

    expect(greeting.next.next("Alice")).toMatchObject({
      tag: "writeLine",
      text: "Hello, Alice!",
    });
  });
});
