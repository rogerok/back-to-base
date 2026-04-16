import { describe, expect, it } from "vitest";

import { TCar } from "./model.ts";
import {
  greaterOrEqual,
  isPositive,
  lessOrEqual,
  maxMileage,
  maxYear,
  minYear,
} from "./predicates.ts";
import {
  buildScoreTable,
  createCarLine,
  createQuestion,
  deriveCorrectAnswer,
  duelScore,
  findWinner,
  getBrandCoef,
  getEngineCoef,
  toPairs,
} from "./utils.ts";

const makeCar = (overrides: { id: number } & Partial<TCar>): TCar => ({
  brand: "BMW",
  engine: "petrol",
  mileage: 50000,
  year: 2015,
  ...overrides,
});

// ── predicates ────────────────────────────────────────────────────────────────

describe("lessOrEqual", () => {
  it("returns true when b < a", () => { expect(lessOrEqual(5)(3)).toBe(true); });
  it("returns true when b === a", () => { expect(lessOrEqual(5)(5)).toBe(true); });
  it("returns false when b > a", () => { expect(lessOrEqual(5)(6)).toBe(false); });
});

describe("greaterOrEqual", () => {
  it("returns true when b > a", () => { expect(greaterOrEqual(5)(7)).toBe(true); });
  it("returns true when b === a", () => { expect(greaterOrEqual(5)(5)).toBe(true); });
  it("returns false when b < a", () => { expect(greaterOrEqual(5)(4)).toBe(false); });
});

describe("isPositive", () => {
  it("returns true for positive number", () => { expect(isPositive(1)).toBe(true); });
  it("returns true for zero", () => { expect(isPositive(0)).toBe(true); });
  it("returns false for negative number", () => { expect(isPositive(-1)).toBe(false); });
});

// ── boundary predicates ───────────────────────────────────────────────────────

describe("maxMileage", () => {
  it("accepts mileage below limit", () => { expect(maxMileage(99999)).toBe(true); });
  it("accepts mileage at limit", () => { expect(maxMileage(100000)).toBe(true); });
  it("rejects mileage above limit", () => { expect(maxMileage(100001)).toBe(false); });
});

describe("minYear", () => {
  it("accepts year at boundary", () => { expect(minYear(2000)).toBe(true); });
  it("accepts year above boundary", () => { expect(minYear(2010)).toBe(true); });
  it("rejects year below boundary", () => { expect(minYear(1999)).toBe(false); });
});

describe("maxYear", () => {
  it("accepts year at boundary", () => { expect(maxYear(2026)).toBe(true); });
  it("accepts year below boundary", () => { expect(maxYear(2020)).toBe(true); });
  it("rejects year above boundary", () => { expect(maxYear(2027)).toBe(false); });
});

// ── coefficients ──────────────────────────────────────────────────────────────

describe("getBrandCoef", () => {
  it("BMW = 3", () => { expect(getBrandCoef(makeCar({ brand: "BMW", id: 1 }))).toBe(3); });
  it("Audi = 2", () => { expect(getBrandCoef(makeCar({ brand: "Audi", id: 1 }))).toBe(2); });
  it("Ford = 1", () => { expect(getBrandCoef(makeCar({ brand: "Ford", id: 1 }))).toBe(1); });
});

describe("getEngineCoef", () => {
  it("electric = 3", () => { expect(getEngineCoef(makeCar({ engine: "electric", id: 1 }))).toBe(3); });
  it("diesel = 2", () => { expect(getEngineCoef(makeCar({ engine: "diesel", id: 1 }))).toBe(2); });
  it("petrol = 1", () => { expect(getEngineCoef(makeCar({ engine: "petrol", id: 1 }))).toBe(1); });
});

// ── duelScore ─────────────────────────────────────────────────────────────────

describe("duelScore", () => {
  it("counts brand + engine coefs", () => {
    const a = makeCar({ brand: "BMW", engine: "electric", id: 1, mileage: 50000, year: 2015 });
    const b = makeCar({ brand: "BMW", engine: "electric", id: 2, mileage: 50000, year: 2015 });
    // BMW(3) + electric(3) + younger(0, same year) + less mileage(0, same) = 6
    expect(duelScore(a, b)).toBe(6);
  });

  it("adds +1 bonus when car is younger", () => {
    const newer = makeCar({ brand: "Ford", engine: "petrol", id: 1, mileage: 50000, year: 2020 });
    const older = makeCar({ brand: "Ford", engine: "petrol", id: 2, mileage: 50000, year: 2010 });
    // Ford(1) + petrol(1) + younger(1) + less mileage(0) = 3
    expect(duelScore(newer, older)).toBe(3);
    // Ford(1) + petrol(1) + younger(0) + less mileage(0) = 2
    expect(duelScore(older, newer)).toBe(2);
  });

  it("adds +1 bonus when car has less mileage", () => {
    const lowMileage = makeCar({
      brand: "Ford",
      engine: "petrol",
      id: 1,
      mileage: 10000,
      year: 2015,
    });
    const highMileage = makeCar({
      brand: "Ford",
      engine: "petrol",
      id: 2,
      mileage: 90000,
      year: 2015,
    });
    // Ford(1) + petrol(1) + younger(0) + less mileage(1) = 3
    expect(duelScore(lowMileage, highMileage)).toBe(3);
    expect(duelScore(highMileage, lowMileage)).toBe(2);
  });
});

// ── toPairs ───────────────────────────────────────────────────────────────────

describe("toPairs", () => {
  it("returns empty array for empty input", () => {
    expect(toPairs([])).toEqual([]);
  });

  it("returns empty array for single car", () => {
    expect(toPairs([makeCar({ id: 1 })])).toEqual([]);
  });

  it("returns one pair for two cars", () => {
    const a = makeCar({ id: 1 });
    const b = makeCar({ id: 2 });
    expect(toPairs([a, b])).toEqual([[a, b]]);
  });

  it("returns 3 pairs for 3 cars", () => {
    const [a, b, c] = [makeCar({ id: 1 }), makeCar({ id: 2 }), makeCar({ id: 3 })];
    expect(toPairs([a, b, c])).toEqual([
      [a, b],
      [a, c],
      [b, c],
    ]);
  });

  it("returns 6 pairs for 4 cars", () => {
    const cars = [1, 2, 3, 4].map((id) => makeCar({ id }));
    expect(toPairs(cars)).toHaveLength(6);
  });
});

// ── buildScoreTable ───────────────────────────────────────────────────────────

describe("buildScoreTable", () => {
  it("contains all car ids", () => {
    const cars = [
      makeCar({ brand: "BMW", engine: "electric", id: 1 }),
      makeCar({ brand: "Ford", engine: "petrol", id: 2 }),
      makeCar({ brand: "Audi", engine: "diesel", id: 3 }),
      makeCar({ brand: "Ford", engine: "petrol", id: 4 }),
    ];
    const table = buildScoreTable(cars);
    expect(Object.keys(table)).toHaveLength(4);
  });

  it("winner has higher score than loser", () => {
    const winner = makeCar({ brand: "BMW", engine: "electric", id: 1, mileage: 10000, year: 2020 });
    const loser = makeCar({ brand: "Ford", engine: "petrol", id: 2, mileage: 90000, year: 2010 });
    const table = buildScoreTable([winner, loser]);
    expect(table[1]).toBeGreaterThan(table[2]);
  });

  it("equal cars get 0.5 each", () => {
    const a = makeCar({ id: 1 });
    const b = makeCar({ id: 2 });
    const table = buildScoreTable([a, b]);
    expect(table[1]).toBe(0.5);
    expect(table[2]).toBe(0.5);
  });

  it("total points equal number of pairs", () => {
    const cars = [1, 2, 3].map((id) => makeCar({ id }));
    const table = buildScoreTable(cars);
    const total = Object.values(table).reduce((a, b) => a + b, 0);
    // 3 pairs, each pair distributes 1 point total
    expect(total).toBe(3);
  });
});

// ── findWinner ────────────────────────────────────────────────────────────────

describe("findWinner", () => {
  it("returns id of car with highest score", () => {
    expect(findWinner({ 1: 0, 2: 1, 3: 2 })).toBe("3");
  });

  it("returns the only car id for single entry", () => {
    expect(findWinner({ 1: 5 })).toBe("1");
  });

  it("returns empty string for empty table", () => {
    expect(findWinner({})).toBe("");
  });
});

// ── deriveCorrectAnswer ───────────────────────────────────────────────────────

describe("deriveCorrectAnswer", () => {
  it("returns (roundLength + 1) when all scores are equal", () => {
    expect(deriveCorrectAnswer({ 1: 1, 2: 1, 3: 1 }, 3)).toBe("4");
  });

  it("returns winner id when scores differ", () => {
    expect(deriveCorrectAnswer({ 1: 0, 2: 2, 3: 1 }, 3)).toBe("2");
  });
});

// ── createCarLine ─────────────────────────────────────────────────────────────

describe("createCarLine", () => {
  it("formats car info correctly", () => {
    const car = makeCar({ brand: "BMW", engine: "petrol", id: 1, mileage: 50000, year: 2015 });
    expect(createCarLine(car)).toBe("1) Brand: BMW, engine: petrol, year: 2015, milleage: 50000");
  });
});

// ── createQuestion ────────────────────────────────────────────────────────────

describe("createQuestion", () => {
  it("includes Equal option as last choice", () => {
    const cars = [makeCar({ id: 1 }), makeCar({ id: 2 })];
    expect(createQuestion(cars)).toContain("3) Equal");
  });

  it("includes all car lines", () => {
    const cars = [makeCar({ brand: "BMW", id: 1 }), makeCar({ brand: "Audi", id: 2 })];
    const question = createQuestion(cars);
    expect(question).toContain("1)");
    expect(question).toContain("2)");
  });
});
