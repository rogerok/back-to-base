// Task 2: IOEither — чтение файла + парсинг + валидация
//
// В задании от ментора loadSettings делал: readFileSync → JSON.parse → io-ts decode.
// Здесь аналогичная задача: прочитать файл, распарсить JSON, провалидировать.
//
// Перепиши используя:
// - IOE.tryCatch для чтения файла
// - IOE.map / IOE.flatMap для цепочки
// - flow для композиции decode → IOE.fromEither

import { readFileSync } from "node:fs";
import path from "node:path";

interface GameConfig {
  difficulty: "easy" | "medium" | "hard";
  maxLives: number;
  timeLimit: number;
}

class ConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ConfigError";
  }
}

function isValidDifficulty(d: unknown): d is "easy" | "medium" | "hard" {
  return d === "easy" || d === "medium" || d === "hard";
}

function validateConfig(data: unknown): GameConfig {
  if (typeof data !== "object" || data === null) {
    throw new ConfigError("Config must be an object");
  }

  const obj = data as Record<string, unknown>;

  if (!isValidDifficulty(obj.difficulty)) {
    throw new ConfigError("Invalid difficulty");
  }
  if (typeof obj.maxLives !== "number" || obj.maxLives < 1) {
    throw new ConfigError("maxLives must be a positive number");
  }
  if (typeof obj.timeLimit !== "number" || obj.timeLimit < 0) {
    throw new ConfigError("timeLimit must be non-negative");
  }

  return {
    difficulty: obj.difficulty,
    maxLives: obj.maxLives,
    timeLimit: obj.timeLimit,
  };
}

function loadGameConfig(filePath: string): GameConfig | ConfigError {
  try {
    const raw = readFileSync(filePath, "utf-8");
    const parsed = JSON.parse(raw);
    return validateConfig(parsed);
  } catch (e) {
    if (e instanceof ConfigError) return e;
    return new ConfigError(String(e));
  }
}

export { loadGameConfig, validateConfig, ConfigError };
export type { GameConfig };
