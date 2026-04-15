import { sequenceS } from "fp-ts/lib/Apply.js";
import * as Console from "fp-ts/lib/Console.js";
import { error } from "fp-ts/lib/Console.js";
import * as E from "fp-ts/lib/Either.js";
import * as Eq from "fp-ts/lib/Eq.js";
import { flow, pipe } from "fp-ts/lib/function.js";
import * as IO from "fp-ts/lib/IO.js";
import * as IOE from "fp-ts/lib/IOEither.js";
import * as J from "fp-ts/lib/Json.js";
import * as N from "fp-ts/lib/number.js";
import * as Ord from "fp-ts/lib/Ord.js";
import * as R from "fp-ts/lib/Random.js";
import * as RTE from "fp-ts/lib/ReaderTaskEither.js";
import * as Semigroup from "fp-ts/lib/Semigroup.js";
import { concatAll } from "fp-ts/Monoid";
import * as NonEmptyArray from "fp-ts/NonEmptyArray";
import * as t from "io-ts";
import * as tt from "io-ts-types";
import * as PathReporter from "io-ts/lib/PathReporter.js";
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
import { createQuestion, generateRounds } from "./utils.ts";

const loadSettingsEither = pipe(
  readFileSync("./settings.json", "utf8"),
  J.parse,
  E.chainW((a) =>
    pipe(
      SettingsSchema.decode(a),
      E.mapLeft((errs) => PathReporter.failure(errs).join("; \n")),
    ),
  ),
  E.mapLeft(
    (e): JsonParseError => ({
      error: E.toError(e),
      type: "JsonDecodeError",
    }),
  ),
);

export const loadSettings = (): TSettings =>
  pipe(
    loadSettingsEither,
    E.getOrElseW((err) => {
      Console.error(err);
      throw new Error(err.error.message);
    }),
  );

const generateRound = (settings: TSettings) => pipe(settings, generateRounds);

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

// TODO: следующим можно сделать сравнение

const eqCar: Eq.Eq<TCar> = Eq.struct({
  brand: Eq,
});

const runGame = (rl: readline.Interface) => (rounds: ReturnType<typeof generateRound>) => {
  const answers = [];

  rounds.forEach((round) => {
    rl.question(createQuestion(round), (answer) => {
      answers.push(answer);
    });
  });

  return null;
};

const run = (rl: readline.Interface) => pipe(loadSettings(), generateRound, runGame(rl));

(async () => {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  // run();

  const main = run(rl);

  // await main();
})();
