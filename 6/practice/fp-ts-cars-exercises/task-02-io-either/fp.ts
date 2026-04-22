// Task 2: IOEither — чтение файла + парсинг + валидация
//
// Перепиши loadGameConfig используя fp-ts:
// - IOE.tryCatch для readFileSync
// - IOE.map(J.parse) для JSON
// - IOE.flatMap для валидации
// - Результат: IOE.IOEither<ConfigError, GameConfig>

import { flow, pipe } from "fp-ts/function";
import * as IOE from "fp-ts/IOEither";
import * as J from "fp-ts/Json";
import * as E from "fp-ts/Either";
import { readFileSync } from "node:fs";

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

// TODO: валидация через Either (вместо throw)
// const validateConfig = (data: unknown): E.Either<ConfigError, GameConfig> => { ... }

// TODO: чтение файла через IOE.tryCatch
// const readFile = (filePath: string) => IOE.tryCatch(() => readFileSync(...), ...)

// TODO: собери пайплайн: readFile → JSON.parse → validate
// const loadGameConfig = (filePath: string): IOE.IOEither<ConfigError, GameConfig> =>
//   pipe(
//     readFile(filePath),
//     IOE.map(J.parse),
//     IOE.flatMap(...)
//   )

const loadGameConfig = (
  filePath: string,
): IOE.IOEither<ConfigError, GameConfig> => {
  throw new Error("TODO");
};

export { loadGameConfig, ConfigError };
export type { GameConfig };
