import { describe, it, expect } from "vitest";
// Переключи импорт на "./fp" когда будешь готов проверить своё решение
import { aggregateStats, sumScores, type RoundResult } from "./imperative";

describe("Task 5: Monoid + concatAll", () => {
  describe("sumScores", () => {
    it("sums an array of numbers", () => {
      expect(sumScores([1, 2, 3, 4, 5])).toBe(15);
    });

    it("returns 0 for empty array", () => {
      expect(sumScores([])).toBe(0);
    });

    it("handles single element", () => {
      expect(sumScores([42])).toBe(42);
    });
  });

  describe("aggregateStats", () => {
    const results: RoundResult[] = [
      { correct: true, points: 10 },
      { correct: true, points: 5 },
      { correct: false, points: 0 },
      { correct: true, points: 15 },
    ];

    it("sums total score", () => {
      expect(aggregateStats(results).totalScore).toBe(30);
    });

    it("counts rounds played", () => {
      expect(aggregateStats(results).roundsPlayed).toBe(4);
    });

    it("allCorrect is false when any incorrect", () => {
      expect(aggregateStats(results).allCorrect).toBe(false);
    });

    it("allCorrect is true when all correct", () => {
      const allRight: RoundResult[] = [
        { correct: true, points: 10 },
        { correct: true, points: 20 },
      ];
      expect(aggregateStats(allRight).allCorrect).toBe(true);
    });

    it("calculates best streak", () => {
      expect(aggregateStats(results).bestStreak).toBe(2); // first two
    });

    it("handles empty array", () => {
      expect(aggregateStats([])).toEqual({
        totalScore: 0,
        roundsPlayed: 0,
        allCorrect: true,
        bestStreak: 0,
      });
    });

    it("streak at end of array", () => {
      const res: RoundResult[] = [
        { correct: false, points: 0 },
        { correct: true, points: 5 },
        { correct: true, points: 5 },
        { correct: true, points: 5 },
      ];
      expect(aggregateStats(res).bestStreak).toBe(3);
    });
  });
});
