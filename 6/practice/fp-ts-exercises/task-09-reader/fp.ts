import { pipe } from "fp-ts/lib/function";
import * as IO from "fp-ts/lib/IO.js";
import * as R from "fp-ts/lib/Reader.js";

// Your solution here
// Hint: Reader<Env, A> is just (env: Env) => A
// Use R.map, R.chain, R.ask, R.asks to compose readers

interface AppConfig {
  apiKey: string;
  apiUrl: string;
  timeout: number;
}

interface Logger {
  error: (msg: string) => void;
  log: (msg: string) => void;
}

interface AppEnv {
  config: AppConfig;
  logger: Logger;
}

const env: AppEnv = {
  config: { apiKey: "secret-key", apiUrl: "https://api.example.com", timeout: 5000 },
  logger: { error: console.error, log: console.log },
};

const buildHeaders = (): R.Reader<AppEnv, Record<string, string>> =>
  pipe(
    R.ask<AppEnv>(),
    R.map((env) => ({
      Authorization: `Bearer ${env.config.apiKey}`,
      "Content-Type": "application/json",
    })),
  );

const logRequest = (method: string, url: string) =>
  pipe(
    R.ask<AppEnv>(),
    R.flatMap((env) =>
      IO.of(() => {
        env.logger.log(`[${method}] ${url}`);
      }),
    ),
  );
