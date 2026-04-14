import * as Eq from "fp-ts/Eq";
import { sequenceS } from "fp-ts/lib/Apply.js";
import * as Console from "fp-ts/lib/Console.js";
import { error } from "fp-ts/lib/Console.js";
import * as E from "fp-ts/lib/Either.js";
import { flow, pipe } from "fp-ts/lib/function.js";
import * as IO from "fp-ts/lib/IO.js";
import * as IOE from "fp-ts/lib/IOEither.js";
import * as J from "fp-ts/lib/Json.js";
import * as N from "fp-ts/lib/number.js";
import * as Ord from "fp-ts/lib/Ord.js";
import * as R from "fp-ts/lib/Random.js";
import * as RTE from "fp-ts/lib/ReaderTaskEither.js";
import { concatAll } from "fp-ts/Monoid";
import * as NonEmptyArray from "fp-ts/NonEmptyArray";
import * as t from "io-ts";
import * as tt from "io-ts-types";
//
// // .... impl
//
// const run = pipe(
//   loadSettings,
//   IOE.flatMap(generateRounds),
//   RTE.fromIOEither,
//   RTE.flatMap(runGame),
//   RTE.map(calculateScore),
//   RTE.flatMap(finishGame),
// );
//
// (async () => {
//   const rl = readline.createInterface({
//     input: process.stdin,
//     output: process.stdout,
//   });
//
//   const main = run(rl);
//
//   await main();
// })();
import { readFileSync } from "node:fs";
import path from "node:path";
import readline from "node:readline";

import { JsonParseError, SettingsSchema, TCar, TRounds, TSettings } from "./model.ts";
import { getRandomArbitrary } from "./utils.ts";

const loadSettings = pipe(
  readFileSync("./settings.json", "utf8"),
  J.parse,
  E.tryCatchK(
    (a) => SettingsSchema.decode(a),
    (e): JsonParseError => ({
      error: E.toError(e),
      type: "JsonDecodeError",
    }),
  ),
);

const generateRound = (settings: E.Either<JsonParseError, TSettings>) => {
  const r = IOE.fromEither(settings);

  console.log(settings);

  return null;
};

// const run = pipe(
//   loadSettings,
//   IOE.flatMap(generateRounds),
//   RTE.fromIOEither,
//   RTE.flatMap(runGame),
//   RTE.map(calculateScore),
//   RTE.flatMap(finishGame),
// );
//
// (async () => {
//   const rl = readline.createInterface({
//     input: process.stdin,
//     output: process.stdout,
//   });
//
//   const main = run(rl);
//
//   await main();
// })();

const run = pipe(loadSettings, generateRound);

(async () => {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  // run();

  // const main = run(rl);

  // await main();
})();
