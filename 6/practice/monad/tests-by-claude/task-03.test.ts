import { describe, expect, it } from "vitest";

import { myProgram } from "../index";

describe("Task 03: myProgram", () => {
  it("is a data structure, not a function", () => {
    expect(typeof myProgram).toBe("object");
    expect(myProgram).not.toBeNull();
  });

  it("starts by asking for a name", () => {
    expect(myProgram).toMatchObject({
      tag: "writeLine",
      text: "What is your name?",
    });
  });

  it("second step reads a line", () => {
    if (myProgram.tag !== "writeLine") throw new Error("unexpected tag");
    expect(myProgram.next.tag).toBe("readLine");
  });

  it("after reading name — asks for age", () => {
    if (myProgram.tag !== "writeLine") throw new Error("unexpected tag");
    if (myProgram.next.tag !== "readLine") throw new Error("unexpected tag");

    const afterName = myProgram.next.next("Alice");
    expect(afterName).toMatchObject({
      tag: "writeLine",
      text: expect.stringContaining("Alice"),
    });
  });

  it("age prompt contains the name that was entered", () => {
    if (myProgram.tag !== "writeLine") throw new Error("unexpected tag");
    if (myProgram.next.tag !== "readLine") throw new Error("unexpected tag");

    const afterAlice = myProgram.next.next("Alice");
    const afterBob = myProgram.next.next("Bob");

    if (afterAlice.tag !== "writeLine") throw new Error("unexpected tag");
    if (afterBob.tag !== "writeLine") throw new Error("unexpected tag");

    expect(afterAlice.text).toContain("Alice");
    expect(afterBob.text).toContain("Bob");
    expect(afterAlice.text).not.toEqual(afterBob.text);
  });

  it("reads age after the age prompt", () => {
    if (myProgram.tag !== "writeLine") throw new Error("unexpected tag");
    if (myProgram.next.tag !== "readLine") throw new Error("unexpected tag");

    const afterName = myProgram.next.next("Alice");
    if (afterName.tag !== "writeLine") throw new Error("unexpected tag");

    expect(afterName.next.tag).toBe("readLine");
  });

  it("final writeLine contains both name and age", () => {
    if (myProgram.tag !== "writeLine") throw new Error("unexpected tag");
    if (myProgram.next.tag !== "readLine") throw new Error("unexpected tag");

    const afterName = myProgram.next.next("Alice");
    if (afterName.tag !== "writeLine") throw new Error("unexpected tag");
    if (afterName.next.tag !== "readLine") throw new Error("unexpected tag");

    const afterAge = afterName.next.next("30");
    expect(afterAge).toMatchObject({
      tag: "writeLine",
      text: expect.stringContaining("Alice"),
    });

    if (afterAge.tag !== "writeLine") throw new Error("unexpected tag");
    expect(afterAge.text).toContain("30");
  });

  it("program ends with pure(undefined) after the last write", () => {
    if (myProgram.tag !== "writeLine") throw new Error("unexpected tag");
    if (myProgram.next.tag !== "readLine") throw new Error("unexpected tag");

    const afterName = myProgram.next.next("Alice");
    if (afterName.tag !== "writeLine") throw new Error("unexpected tag");
    if (afterName.next.tag !== "readLine") throw new Error("unexpected tag");

    const afterAge = afterName.next.next("30");
    if (afterAge.tag !== "writeLine") throw new Error("unexpected tag");

    expect(afterAge.next).toEqual({ tag: "pure", value: undefined });
  });
});
