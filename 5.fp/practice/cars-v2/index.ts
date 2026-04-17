import * as Console from "fp-ts/lib/Console.js";
import * as E from "fp-ts/lib/Either.js";
import { pipe } from "fp-ts/lib/function.js";
import * as IOEither from "fp-ts/lib/IOEither.js";
import * as J from "fp-ts/lib/Json.js";
import * as RTE from "fp-ts/lib/ReaderTaskEither.js";
import * as RA from "fp-ts/lib/ReadonlyArray.js";
import * as PathReporter from "io-ts/lib/PathReporter.js";
import readline from "node:readline";

import { JsonParseError, SettingsSchema } from "./model.ts";
import { readFile } from "./utils.ts";

const loadSettingsEither = readFile("./settings.json", "utf8");

export const loadSettings = () =>
  pipe(
    loadSettingsEither,

    IOEither.flatMapEither(J.parse),
    IOEither.flatMapEither((a) =>
      pipe(
        SettingsSchema.decode(a),
        E.mapLeft((errs) => PathReporter.failure(errs).join("; \n")),
      ),
    ),
    IOEither.mapLeft(
      (e): JsonParseError => ({
        error: E.toError(e),
        type: "JsonDecodeError",
      }),
    ),
  );

const run = (rl: readline.Interface) => pipe(loadSettings);

void (async () => {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  await run(rl)();
  rl.close();
})();
