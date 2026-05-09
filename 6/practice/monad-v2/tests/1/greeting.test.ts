import { describe, expect, it } from "vitest";

import { greeting } from "../../index";
import { IO } from "../../type.ts";

describe("E1.2 — greeting tree", () => {
  it("is a writeLine at the root", () => {
    expect(greeting.tag).toBe("writeLine");
  });

  it("root writeLine contains the prompt text", () => {
    expect(greeting.tag).toBe("writeLine");
    if (greeting.tag !== "writeLine") return;
    expect(greeting.text).toBe("What is your name?");
  });

  it("second node is readLine", () => {
    if (greeting.tag !== "writeLine") throw new Error("unexpected root tag");
    expect(greeting.next.tag).toBe("readLine");
  });

  it("readLine.next is a function (continuation)", () => {
    if (greeting.tag !== "writeLine") throw new Error("unexpected root tag");
    const readNode = greeting.next;
    if (readNode.tag !== "readLine") throw new Error("unexpected second tag");
    expect(typeof readNode.next).toBe("function");
  });

  it("calling readLine.next produces a writeLine with greeting", () => {
    if (greeting.tag !== "writeLine") throw new Error("unexpected root tag");
    const readNode = greeting.next;
    if (readNode.tag !== "readLine") throw new Error("unexpected second tag");

    const result = readNode.next("Alice");
    expect(result.tag).toBe("writeLine");
    if (result.tag !== "writeLine") return;
    expect(result.text).toBe("Hello, Alice!");
  });

  it("the final node is pure(undefined)", () => {
    if (greeting.tag !== "writeLine") throw new Error("unexpected root tag");
    const readNode = greeting.next;
    if (readNode.tag !== "readLine") throw new Error("unexpected second tag");

    const writeNode = readNode.next("Bob");
    if (writeNode.tag !== "writeLine") throw new Error("unexpected third tag");

    expect(writeNode.next.tag).toBe("pure");
    if (writeNode.next.tag !== "pure") return;
    expect(writeNode.next.value).toBeUndefined();
  });

  it("greeting is pure data — creating it causes no side effects", () => {
    const g: IO<void> = greeting;
    expect(g).toBeDefined();
    expect(typeof g).toBe("object");
  });
});
