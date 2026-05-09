import { describe, expect, it } from "vitest";

import { pure, readLine, writeLine } from "../../index";

describe("E2.1 — pure", () => {
  it("produces a node with tag 'pure'", () => {
    expect(pure(42).tag).toBe("pure");
  });

  it("stores the given value", () => {
    const result = pure("hello");
    if (result.tag !== "pure") throw new Error("expected pure");
    expect(result.value).toBe("hello");
  });

  it("is a function, not a value", () => {
    expect(typeof pure).toBe("function");
  });
});

describe("E2.1 — readLine", () => {
  it("is a plain object, not a function", () => {
    expect(typeof readLine).toBe("object");
    expect(typeof readLine).not.toBe("function");
  });

  it("has tag 'readLine'", () => {
    expect(readLine.tag).toBe("readLine");
  });

  it("next is a continuation (function)", () => {
    if (readLine.tag !== "readLine") throw new Error("expected readLine");
    expect(typeof readLine.next).toBe("function");
  });

  it("readLine.next wraps the string in pure", () => {
    if (readLine.tag !== "readLine") throw new Error("expected readLine");
    const result = readLine.next("Alice");
    expect(result.tag).toBe("pure");
    if (result.tag !== "pure") return;
    expect(result.value).toBe("Alice");
  });
});

describe("E2.1 — writeLine", () => {
  it("is a function (unlike readLine)", () => {
    expect(typeof writeLine).toBe("function");
  });

  it("produces a node with tag 'writeLine'", () => {
    expect(writeLine("hi").tag).toBe("writeLine");
  });

  it("stores the text", () => {
    const node = writeLine("hello world");
    if (node.tag !== "writeLine") throw new Error("expected writeLine");
    expect(node.text).toBe("hello world");
  });

  it("next is pure(undefined) — writeLine yields void", () => {
    const node = writeLine("hi");
    if (node.tag !== "writeLine") throw new Error("expected writeLine");
    expect(node.next.tag).toBe("pure");
    if (node.next.tag !== "pure") return;
    expect(node.next.value).toBeUndefined();
  });
});
