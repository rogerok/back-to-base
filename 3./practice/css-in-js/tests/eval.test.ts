import { describe, expect } from "vitest";

import { evaluator } from "../ast/ast.ts";

describe("evaluator", () => {
  it("adds numbers", () => {
    expect(evaluator("2 + 3")).toBe(5);
  });

  it("subtracts numbers", () => {
    expect(evaluator("5 - 2")).toBe(3);
  });

  it("multiplies numbers", () => {
    expect(evaluator("4 * 3")).toBe(12);
  });

  it("divides numbers", () => {
    expect(evaluator("8 / 2")).toBe(4);
  });

  it("respects operator precedence", () => {
    expect(evaluator("2 + 3 * 4")).toBe(14);
  });

  it("respects parentheses", () => {
    expect(evaluator("(2 + 3) *4")).toBe(20);
  });

  it("handles complex expression", () => {
    expect(evaluator("8 - (4 + 6 ) / 2 - 1")).toBe(2);
  });

  it("handles multiple operations", () => {
    expect(evaluator("3+4*2/2")).toBe(7);
  });

  it("handles spaces", () => {
    expect(evaluator(" 3 + 4 * 2 / 2 ")).toBe(7);
  });
});
