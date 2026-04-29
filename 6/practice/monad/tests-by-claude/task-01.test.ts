import { describe, expect, it } from "vitest";

import { greeting, pure, readLine, writeLine } from "../index";

describe("Task 01: IO DSL and smart constructors", () => {
  describe("pure", () => {
    it("preserves string value", () => {
      expect(pure("hello")).toEqual({ tag: "pure", value: "hello" });
    });

    it("preserves number value", () => {
      expect(pure(0)).toEqual({ tag: "pure", value: 0 });
    });

    it("preserves null", () => {
      expect(pure(null)).toEqual({ tag: "pure", value: null });
    });

    it("preserves undefined", () => {
      expect(pure(undefined)).toEqual({ tag: "pure", value: undefined });
    });

    it("preserves object by reference", () => {
      const obj = { a: 1 };
      expect(pure(obj).value).toBe(obj);
    });

    it("two calls with same value produce equal structures", () => {
      expect(pure(42)).toEqual(pure(42));
    });
  });

  describe("readLine", () => {
    it("has tag readLine", () => {
      expect(readLine.tag).toBe("readLine");
    });

    it("next is a function", () => {
      expect(typeof readLine.next).toBe("function");
    });

    it("next('x') returns pure('x') — identity continuation", () => {
      expect(readLine.next("hello")).toEqual(pure("hello"));
    });

    it("next is a pure function — same input produces equal output", () => {
      expect(readLine.next("abc")).toEqual(readLine.next("abc"));
    });
  });

  describe("writeLine", () => {
    it("has tag writeLine", () => {
      expect(writeLine("hi").tag).toBe("writeLine");
    });

    it("preserves the text", () => {
      expect(writeLine("hello world").text).toBe("hello world");
    });

    it("works with empty string", () => {
      expect(writeLine("").text).toBe("");
    });

    it("next is pure(undefined)", () => {
      expect(writeLine("anything").next).toEqual(pure(undefined));
    });

    it("two calls produce equal but independent structures", () => {
      expect(writeLine("x")).toEqual(writeLine("x"));
      expect(writeLine("x")).not.toBe(writeLine("x"));
    });
  });

  describe("greeting", () => {
    it("is a data structure, not a function", () => {
      expect(typeof greeting).toBe("object");
    });

    it("starts with writeLine asking for name", () => {
      expect(greeting).toMatchObject({ tag: "writeLine", text: "What is your name?" });
    });

    it("second step is readLine", () => {
      if (greeting.tag !== "writeLine") throw new Error("unexpected tag");
      expect(greeting.next.tag).toBe("readLine");
    });

    it("after reading name — prints greeting with that name", () => {
      if (greeting.tag !== "writeLine") throw new Error("unexpected tag");
      if (greeting.next.tag !== "readLine") throw new Error("unexpected tag");

      expect(greeting.next.next("Bob")).toMatchObject({
        tag: "writeLine",
        text: "Hello, Bob!",
      });
    });

    it("greeting with different names produces different texts", () => {
      if (greeting.tag !== "writeLine") throw new Error("unexpected tag");
      if (greeting.next.tag !== "readLine") throw new Error("unexpected tag");

      const forAlice = greeting.next.next("Alice");
      const forBob = greeting.next.next("Bob");

      expect(forAlice).not.toEqual(forBob);
    });

    it("final step is pure(undefined)", () => {
      if (greeting.tag !== "writeLine") throw new Error("unexpected tag");
      if (greeting.next.tag !== "readLine") throw new Error("unexpected tag");

      const last = greeting.next.next("Alice");

      if (last.tag !== "writeLine") throw new Error("unexpected tag");
      expect(last.next).toEqual(pure(undefined));
    });
  });
});
