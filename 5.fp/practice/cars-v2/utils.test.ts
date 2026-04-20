import * as E from "fp-ts/lib/Either.js";
import { describe, expect, it } from "vitest";

import { SettingsSchema, TCar, TSettings } from "./model.ts";
import {
  buildRounds,
  buildScoreTable,
  createCarLine,
  createQuestion,
  deriveCorrectAnswer,
  duelScore,
  findWinner,
  generateRandomCar,
  getBoolBonus,
  ordByScore,
  toPairs,
} from "./utils.ts";

// ── fixtures ──────────────────────────────────────────────────────────────────

const makeSettings = (overrides: Partial<TSettings> = {}): TSettings => ({
  allowedBrands: ["BMW", "Audi", "Ford"] as unknown as TSettings["allowedBrands"],
  allowedEngines: ["electric", "diesel", "petrol"] as unknown as TSettings["allowedEngines"],
  carsInRound: 3,
  maxMileage: 100000,
  maxYear: 2024,
  mileageDifference: 20000,
  minYear: 2000,
  numRounds: 5,
  ...overrides,
});

const makeCar = (overrides: { id: number } & Partial<TCar>): TCar => ({
  brand: "BMW",
  brandCoef: 1,
  engine: "petrol",
  engineCoef: 1,
  id: 1,
  mileage: 50000,
  year: 2015,
  ...overrides,
});

// ── SettingsSchema ────────────────────────────────────────────────────────────

describe("SettingsSchema", () => {
  const valid = {
    allowedBrands: ["BMW", "Audi"],
    allowedEngines: ["petrol", "diesel"],
    carsInRound: 3,
    maxMileage: 100000,
    maxYear: 2024,
    mileageDifference: 20000,
    minYear: 2000,
    numRounds: 5,
  };

  it("accepts valid settings", () => {
    expect(E.isRight(SettingsSchema.decode(valid))).toBe(true);
  });

  it("rejects empty allowedBrands", () => {
    expect(E.isLeft(SettingsSchema.decode({ ...valid, allowedBrands: [] }))).toBe(true);
  });

  it("rejects empty allowedEngines", () => {
    expect(E.isLeft(SettingsSchema.decode({ ...valid, allowedEngines: [] }))).toBe(true);
  });

  it("rejects negative carsInRound", () => {
    expect(E.isLeft(SettingsSchema.decode({ ...valid, carsInRound: -1 }))).toBe(true);
  });

  it("rejects when maxYear <= minYear", () => {
    expect(E.isLeft(SettingsSchema.decode({ ...valid, maxYear: 2000, minYear: 2000 }))).toBe(true);
    expect(E.isLeft(SettingsSchema.decode({ ...valid, maxYear: 1999, minYear: 2000 }))).toBe(true);
  });

  it("rejects when mileageDifference >= maxMileage", () => {
    expect(
      E.isLeft(SettingsSchema.decode({ ...valid, mileageDifference: 100000, maxMileage: 100000 })),
    ).toBe(true);
    expect(
      E.isLeft(SettingsSchema.decode({ ...valid, mileageDifference: 200000, maxMileage: 100000 })),
    ).toBe(true);
  });

  it("rejects missing fields", () => {
    const { numRounds: _, ...incomplete } = valid;
    expect(E.isLeft(SettingsSchema.decode(incomplete))).toBe(true);
  });
});

// ── generateRandomCar ─────────────────────────────────────────────────────────

describe("generateRandomCar", () => {
  const s = makeSettings();

  it("returns a car with the given id", () => {
    expect(generateRandomCar(s, 42).id).toBe(42);
  });

  it("year is within [minYear, maxYear]", () => {
    for (let i = 0; i < 20; i++) {
      const { year } = generateRandomCar(s, i);
      expect(year).toBeGreaterThanOrEqual(s.minYear);
      expect(year).toBeLessThanOrEqual(s.maxYear);
    }
  });

  it("mileage does not exceed maxMileage", () => {
    for (let i = 0; i < 20; i++) {
      expect(generateRandomCar(s, i).mileage).toBeLessThanOrEqual(s.maxMileage);
    }
  });

  it("brand is from allowedBrands", () => {
    for (let i = 0; i < 20; i++) {
      expect(s.allowedBrands).toContain(generateRandomCar(s, i).brand);
    }
  });

  it("engine is from allowedEngines", () => {
    for (let i = 0; i < 20; i++) {
      expect(s.allowedEngines).toContain(generateRandomCar(s, i).engine);
    }
  });

  it("brandCoef is between 1 and allowedBrands.length", () => {
    for (let i = 0; i < 20; i++) {
      const { brandCoef } = generateRandomCar(s, i);
      expect(brandCoef).toBeGreaterThanOrEqual(1);
      expect(brandCoef).toBeLessThanOrEqual(s.allowedBrands.length);
    }
  });

  it("engineCoef is between 1 and allowedEngines.length", () => {
    for (let i = 0; i < 20; i++) {
      const { engineCoef } = generateRandomCar(s, i);
      expect(engineCoef).toBeGreaterThanOrEqual(1);
      expect(engineCoef).toBeLessThanOrEqual(s.allowedEngines.length);
    }
  });
});

// ── buildRounds ───────────────────────────────────────────────────────────────

describe("buildRounds", () => {
  it("generates numRounds rounds", () => {
    const s = makeSettings({ numRounds: 4 });
    expect(buildRounds(s)).toHaveLength(4);
  });

  it("each round has carsInRound cars", () => {
    const s = makeSettings({ carsInRound: 3, numRounds: 2 });
    buildRounds(s).forEach((round) => {
      expect(round).toHaveLength(3);
    });
  });

  it("car ids within a round start at 1", () => {
    const s = makeSettings({ carsInRound: 3, numRounds: 1 });
    const ids = buildRounds(s)[0].map((c) => c.id);
    expect(ids).toEqual([1, 2, 3]);
  });
});

// ── getBoolBonus ──────────────────────────────────────────────────────────────

describe("getBoolBonus", () => {
  it("returns 1 for true", () => { expect(getBoolBonus(true)).toBe(1); });
  it("returns 0 for false", () => { expect(getBoolBonus(false)).toBe(0); });
});

// ── duelScore ─────────────────────────────────────────────────────────────────

describe("duelScore", () => {
  // formula: a.brandCoef + b.brandCoef + isYounger(a,b) + isHigherMileage(a,b)
  it("sums a.brandCoef + b.brandCoef + year bonus + mileage bonus", () => {
    const a = makeCar({ brandCoef: 3, id: 1, mileage: 90000, year: 2020 });
    const b = makeCar({ brandCoef: 1, id: 2, mileage: 10000, year: 2010 });
    // 3 + 1 + 1(younger) + 1(higher mileage) = 6
    expect(duelScore(a, b)).toBe(6);
  });

  it("no bonuses when cars are identical", () => {
    const a = makeCar({ brandCoef: 2, id: 1 });
    const b = makeCar({ brandCoef: 2, id: 2 });
    // 2 + 2 + 0 + 0 = 4
    expect(duelScore(a, b)).toBe(4);
  });

  it("year bonus goes to younger car", () => {
    const newer = makeCar({ brandCoef: 1, id: 1, year: 2020 });
    const older = makeCar({ brandCoef: 1, id: 2, year: 2010 });
    expect(duelScore(newer, older)).toBe(3); // 1+1+1+0
    expect(duelScore(older, newer)).toBe(2); // 1+1+0+0
  });

  it("mileage bonus goes to car with higher mileage", () => {
    const high = makeCar({ brandCoef: 1, id: 1, mileage: 90000 });
    const low = makeCar({ brandCoef: 1, id: 2, mileage: 10000 });
    expect(duelScore(high, low)).toBe(3); // 1+1+0+1
    expect(duelScore(low, high)).toBe(2); // 1+1+0+0
  });
});

// ── toPairs ───────────────────────────────────────────────────────────────────

describe("toPairs", () => {
  it("returns empty for empty input", () => {
    expect(toPairs([])).toEqual([]);
  });

  it("returns empty for single car", () => {
    expect(toPairs([makeCar({ id: 1 })])).toEqual([]);
  });

  it("returns one pair for two cars", () => {
    const a = makeCar({ id: 1 });
    const b = makeCar({ id: 2 });
    expect(toPairs([a, b])).toEqual([[a, b]]);
  });

  it("returns 3 pairs for 3 cars", () => {
    const [a, b, c] = [makeCar({ id: 1 }), makeCar({ id: 2 }), makeCar({ id: 3 })];
    expect(toPairs([a, b, c])).toEqual([[a, b], [a, c], [b, c]]);
  });

  it("returns n*(n-1)/2 pairs for n cars", () => {
    const cars = [1, 2, 3, 4].map((id) => makeCar({ id }));
    expect(toPairs(cars)).toHaveLength(6);
  });
});

// ── buildScoreTable ───────────────────────────────────────────────────────────

describe("buildScoreTable", () => {
  it("contains all car ids as keys", () => {
    const cars = [1, 2, 3].map((id) => makeCar({ id }));
    const table = buildScoreTable(cars);
    expect(Object.keys(table)).toHaveLength(3);
  });

  it("winner has higher score than loser", () => {
    // winner gets both bonuses: younger year AND higher mileage
    const winner = makeCar({ brandCoef: 3, id: 1, mileage: 90000, year: 2022 });
    const loser = makeCar({ brandCoef: 1, id: 2, mileage: 10000, year: 2005 });
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

  it("total points equals number of pairs", () => {
    const cars = [1, 2, 3, 4].map((id) => makeCar({ id }));
    const table = buildScoreTable(cars);
    const total = Object.values(table).reduce((a, b) => a + b, 0);
    expect(total).toBe(6); // 4 cars → 6 pairs
  });
});

// ── ordByScore ────────────────────────────────────────────────────────────────

describe("ordByScore", () => {
  it("orders by score ascending", () => {
    const a: [string, number] = ["1", 2];
    const b: [string, number] = ["2", 5];
    expect(ordByScore.compare(a, b)).toBe(-1);
    expect(ordByScore.compare(b, a)).toBe(1);
    expect(ordByScore.compare(a, a)).toBe(0);
  });
});

// ── findWinner ────────────────────────────────────────────────────────────────

describe("findWinner", () => {
  it("returns id with highest score", () => {
    expect(findWinner({ 1: 0, 2: 3, 3: 1 })).toBe("2");
  });

  it("returns the only id for single entry", () => {
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
    expect(createCarLine(car)).toBe(
      "1) Brand: BMW, engine: petrol, year: 2015, milleage: 50000",
    );
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
    const q = createQuestion(cars);
    expect(q).toContain("1)");
    expect(q).toContain("2)");
  });
});
