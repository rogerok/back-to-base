import { describe, it, expect } from "vitest";
// Переключи импорт на "./fp" когда будешь готов проверить своё решение
import { compareStudents, sortStudents, type Student } from "./imperative";

const alice: Student = { name: "Alice", gpa: 3.8, attendance: 95, demerits: 1 };
const bob: Student = { name: "Bob", gpa: 3.8, attendance: 95, demerits: 3 };
const charlie: Student = { name: "Charlie", gpa: 3.9, attendance: 80, demerits: 0 };
const diana: Student = { name: "Diana", gpa: 3.8, attendance: 90, demerits: 0 };
const eve: Student = { name: "Eve", gpa: 3.5, attendance: 100, demerits: 0 };

describe("Task 1: Ord + contramap", () => {
  describe("compareStudents", () => {
    it("higher gpa wins", () => {
      expect(compareStudents(charlie, alice)).toBeLessThan(0);
    });

    it("equal gpa — higher attendance wins", () => {
      expect(compareStudents(alice, diana)).toBeLessThan(0);
    });

    it("equal gpa and attendance — fewer demerits wins", () => {
      expect(compareStudents(alice, bob)).toBeLessThan(0);
    });

    it("identical students return 0", () => {
      expect(compareStudents(alice, { ...alice })).toBe(0);
    });
  });

  describe("sortStudents", () => {
    it("sorts by composite criteria", () => {
      const sorted = sortStudents([eve, bob, charlie, diana, alice]);
      const names = sorted.map((s) => s.name);
      // charlie(3.9) > alice(3.8,95,1) > bob(3.8,95,3) > diana(3.8,90,0) > eve(3.5)
      expect(names).toEqual(["Charlie", "Alice", "Bob", "Diana", "Eve"]);
    });

    it("does not mutate original array", () => {
      const original = [eve, alice];
      sortStudents(original);
      expect(original[0].name).toBe("Eve");
    });
  });
});
