import { describe, expect, it } from "vitest";

import { greeting } from "./type";

describe("IO DSL: Part 1", () => {
  it("builds a program value as plain tagged data", () => {
    expect(greeting).toMatchObject({
      tag: "writeLine",
      text: "What is your name?",
    });
  });

  it("continues with readLine after the first writeLine", () => {
    expect(greeting.tag).toBe("writeLine");

    if (greeting.tag !== "writeLine") {
      throw new Error("Expected greeting root tag to be writeLine");
    }

    expect(greeting.next.tag).toBe("readLine");
    expect(typeof greeting.next.next).toBe("function");
  });

  it("uses readLine result in the next continuation", () => {
    if (greeting.tag !== "writeLine") {
      throw new Error("Expected greeting root tag to be writeLine");
    }

    const afterRead = greeting.next;

    if (afterRead.tag !== "readLine") {
      throw new Error("Expected second node tag to be readLine");
    }

    const programAfterName = afterRead.next("Alice");

    expect(programAfterName).toMatchObject({
      tag: "writeLine",
      text: "Hello, Alice!",
    });

    if (programAfterName.tag !== "writeLine") {
      throw new Error("Expected continuation tag to be writeLine");
    }

    expect(programAfterName.next).toMatchObject({
      tag: "pure",
      value: undefined,
    });
  });
});
