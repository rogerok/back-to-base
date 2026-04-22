import { describe, it, expect } from "vitest";
import * as E from "fp-ts/Either";
import path from "node:path";
// Переключи импорт на "./fp" когда будешь готов проверить своё решение
import { loadGameConfig, ConfigError, type GameConfig } from "./imperative";

// eslint-disable-next-line unicorn/prefer-module
const configPath = path.join(__dirname, "config.json");
const badPath = path.join(__dirname, "nonexistent.json");

describe("Task 2: IOEither", () => {
  it("loads valid config", () => {
    const result = loadGameConfig(configPath);
    // Императивная версия возвращает GameConfig | ConfigError
    // FP версия возвращает IOEither — нужно вызвать ()
    const config = typeof result === "function" ? result() : result;

    // Для FP: result будет Either<ConfigError, GameConfig>
    const value = isEither(config) ? (E.isRight(config) ? config.right : config.left) : config;

    expect(value).toEqual({
      difficulty: "medium",
      maxLives: 3,
      timeLimit: 60,
    });
  });

  it("returns error for missing file", () => {
    const result = loadGameConfig(badPath);
    const config = typeof result === "function" ? result() : result;

    if (isEither(config)) {
      expect(E.isLeft(config)).toBe(true);
    } else {
      expect(config).toBeInstanceOf(ConfigError);
    }
  });
});

function isEither(x: unknown): x is E.Either<unknown, unknown> {
  return (
    typeof x === "object" &&
    x !== null &&
    "_tag" in x &&
    (x._tag === "Left" || x._tag === "Right")
  );
}
