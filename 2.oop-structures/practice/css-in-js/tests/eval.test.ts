import { describe, expect } from "vitest";

import { evaluator, parseToRpn } from "../eval.ts";

describe("parseToRpn", () => {
  it("converts simple addition", () => {
    expect(parseToRpn("2+3")).toBe("23+");
  });

  it("respects multiplication priority", () => {
    expect(parseToRpn("2+3*4")).toBe("234*+");
  });

  it("handles parentheses", () => {
    expect(parseToRpn("8-(4+6)/2-1")).toBe("846+2/-1-");
  });

  it("handles exponent", () => {
    expect(parseToRpn("2**3")).toBe("23**");
  });

  it("removes whitespace", () => {
    expect(parseToRpn(" 2 + 3 * 4 ")).toBe("234*+");
  });
});

describe("evaluator", () => {
  it("adds numbers", () => {
    expect(evaluator("2+3")).toBe(5);
  });

  it("subtracts numbers", () => {
    expect(evaluator("5-2")).toBe(3);
  });

  it("multiplies numbers", () => {
    expect(evaluator("4*3")).toBe(12);
  });

  it("divides numbers", () => {
    expect(evaluator("8/2")).toBe(4);
  });

  it("calculates modulo", () => {
    expect(evaluator("10%3")).toBe(1);
  });

  it("calculates exponent", () => {
    expect(evaluator("2**3")).toBe(8);
  });

  it("respects operator precedence", () => {
    expect(evaluator("2+3*4")).toBe(14);
  });

  it("respects parentheses", () => {
    expect(evaluator("(2+3)*4")).toBe(20);
  });

  it("handles complex expression", () => {
    expect(evaluator("8-(4+6)/2-1")).toBe(2);
  });

  it("handles multiple operations", () => {
    expect(evaluator("3+4*2/2")).toBe(7);
  });

  it("handles spaces", () => {
    expect(evaluator(" 3 + 4 * 2 / 2 ")).toBe(7);
  });
});
