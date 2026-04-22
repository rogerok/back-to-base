import { describe, it, expect } from "vitest";
// Переключи импорт на "./fp" когда будешь готов проверить своё решение
import { generateCharacter, CLASSES, WEAPONS, type Character } from "./imperative";

describe("Task 3: sequenceS(IO.Apply)", () => {
  it("generates a valid character", () => {
    // Императивная версия: generateCharacter() вызывается как функция
    // FP версия: generateCharacter — это IO<Character>, тоже вызывается ()
    const char: Character = typeof generateCharacter === "function"
      ? generateCharacter()
      : generateCharacter;

    expect(CLASSES).toContain(char.class);
    expect(char.strength).toBeGreaterThanOrEqual(3);
    expect(char.strength).toBeLessThanOrEqual(20);
    expect(char.intelligence).toBeGreaterThanOrEqual(3);
    expect(char.intelligence).toBeLessThanOrEqual(20);
    expect(char.agility).toBeGreaterThanOrEqual(3);
    expect(char.agility).toBeLessThanOrEqual(20);
    expect(WEAPONS).toContain(char.weapon);
  });

  it("generates different characters (not always the same)", () => {
    const gen = typeof generateCharacter === "function" ? generateCharacter : () => generateCharacter;
    const chars = Array.from({ length: 20 }, gen);
    const unique = new Set(chars.map((c) => JSON.stringify(c)));
    // С 20 попытками должно быть хотя бы 2 разных
    expect(unique.size).toBeGreaterThan(1);
  });
});
