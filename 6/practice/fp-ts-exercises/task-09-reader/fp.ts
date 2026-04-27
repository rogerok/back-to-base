import * as Console from "fp-ts/lib/Console.js";
import { pipe } from "fp-ts/lib/function";
import * as IO from "fp-ts/lib/IO.js";
import * as R from "fp-ts/lib/Reader.js";
import * as ReaderIO from "fp-ts/lib/ReaderIO.js";

interface AppConfig {
  apiKey: string;
  apiUrl: string;
  timeout: number;
}

interface Logger {
  error: (msg: string) => IO.IO<void>;
  log: (msg: string) => IO.IO<void>;
}

interface AppEnv {
  config: AppConfig;
  logger: Logger;
}

const env: AppEnv = {
  config: { apiKey: "secret-key", apiUrl: "https://api.example.com", timeout: 5000 },
  logger: { error: Console.error, log: Console.log },
};

const buildHeaders = (): R.Reader<AppEnv, Record<string, string>> =>
  pipe(
    R.ask<AppEnv>(),
    R.map((env) => ({
      Authorization: `Bearer ${env.config.apiKey}`,
      "Content-Type": "application/json",
    })),
  );

const logRequest = (method: string, url: string): ReaderIO.ReaderIO<AppEnv, void> =>
  pipe(
    ReaderIO.asks<AppEnv, Logger>((env) => env.logger),
    ReaderIO.chainIOK((logger) => logger.log(`[${method}] ${url}`)),
  );

const buildUrl = (path: string): R.Reader<AppEnv, string> =>
  pipe(
    R.asks<AppEnv, AppConfig>((env) => env.config),
    R.map((config) => `${config.apiUrl}/${path}`),
  );

const makeRequest = (method: string, path: string): ReaderIO.ReaderIO<AppEnv, string> =>
  pipe(
    ReaderIO.fromReader(buildUrl(path)),
    ReaderIO.chainFirst((url) => logRequest(method, url)),
    ReaderIO.chain((url) =>
      pipe(
        ReaderIO.fromReader(buildHeaders()),
        ReaderIO.map(
          (headers) => `Request: ${method} ${url} with headers ${JSON.stringify(headers)}`,
        ),
      ),
    ),
  );
