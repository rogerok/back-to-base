import { describe, expect, it } from "vitest";

import { myProgram } from "../index";

describe("Task 03: myProgram", () => {
  it("exports myProgram as an IO value, not a factory function", () => {
    expect(typeof myProgram).not.toBe("function");
    expect(myProgram).toMatchObject({
      tag: "writeLine",
      text: "What is your name?",
    });
  });
});
