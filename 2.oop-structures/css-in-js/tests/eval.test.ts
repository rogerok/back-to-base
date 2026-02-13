import { describe, expect } from "vitest";

import { evaluator } from "../eval.ts";

describe("evaluator test", () => {
  it("should return 2", () => {});
  expect(evaluator("8 - (4 + 6) / 2 - 1")).toBe(2);
});
