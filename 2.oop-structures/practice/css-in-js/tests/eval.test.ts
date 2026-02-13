import { describe, expect } from "vitest";

import { parseToRpn } from "../eval.ts";

// describe("evaluator test", () => {
//   it("should return 2", () => {});
//   expect(evaluator("8 - (4 + 6) / 2 - 1")).toBe(2);
// });

describe("parser test", () => {
  it("should return 846+2/-1-", () => {
    expect(parseToRpn("8 - (4 + 6) / 2 - 1")).toBe("846+2/-1-");
  });
  it("should return 324*+", () => {
    expect(parseToRpn("3 + 2 * 4")).toBe("324*+");
  });
});
