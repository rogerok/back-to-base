import { describe, it, expect } from "vitest";
// Переключи импорт на "./fp" когда будешь готов проверить своё решение
import { generateQuestion, calculate, OPERATORS, type MathQuestion } from "./imperative";

describe("Task 4: IO.Do + IO.bind", () => {
  it("generates a valid question", () => {
    const q: MathQuestion = typeof generateQuestion === "function"
      ? generateQuestion()
      : generateQuestion;

    expect(q.operand1).toBeGreaterThanOrEqual(1);
    expect(q.operand1).toBeLessThanOrEqual(50);
    expect(q.operand2).toBeGreaterThanOrEqual(1);
    expect(q.operand2).toBeLessThanOrEqual(50);
    expect(OPERATORS).toContain(q.operator);
  });

  it("answer matches calculation", () => {
    const gen = typeof generateQuestion === "function" ? generateQuestion : () => generateQuestion;
    for (let i = 0; i < 20; i++) {
      const q = gen();
      expect(q.answer).toBe(calculate(q.operand1, q.operand2, q.operator));
    }
  });

  it("text matches the question format", () => {
    const gen = typeof generateQuestion === "function" ? generateQuestion : () => generateQuestion;
    const q = gen();
    expect(q.text).toBe(`${q.operand1} ${q.operator} ${q.operand2} = ?`);
  });

  it("generates different questions", () => {
    const gen = typeof generateQuestion === "function" ? generateQuestion : () => generateQuestion;
    const questions = Array.from({ length: 20 }, gen);
    const unique = new Set(questions.map((q) => q.text));
    expect(unique.size).toBeGreaterThan(1);
  });
});
