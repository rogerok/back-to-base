import { boolean } from "fp-ts";
import * as Array from "fp-ts/lib/Array.js";
import * as Console from "fp-ts/lib/Console.js";
import * as E from "fp-ts/lib/Either.js";
import { pipe } from "fp-ts/lib/function.js";
import * as J from "fp-ts/lib/Json.js";
import * as RTE from "fp-ts/lib/ReaderTaskEither.js";
import * as RA from "fp-ts/lib/ReadonlyArray.js";
import * as Record from "fp-ts/lib/Record.js";
import * as TE from "fp-ts/lib/TaskEither.js";
import * as t from "io-ts";
import * as PathReporter from "io-ts/lib/PathReporter.js";
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
import readline from "node:readline";

import { JsonParseError, ScoreTable, SettingsSchema, TRounds, TSettings } from "./model.ts";
import { buildScoreTable, createQuestion, generateRounds, readFile } from "./utils.ts";

const loadSettingsEither = pipe(
  readFile("./settings.json", "utf8"),
  E.chainW(J.parse),
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

type Env = {
  rl: readline.Interface;
};

const generateRound = (settings: TSettings) => pipe(settings, generateRounds);

const askQuestion = (car: TRounds): RTE.ReaderTaskEither<Env, Error, string> =>
  pipe(
    RTE.ask<Env>(),
    RTE.flatMapTaskEither(({ rl }) =>
      TE.tryCatch(
        () =>
          new Promise<string>((resolve) => {
            // TODO: add validation
            rl.question(createQuestion(car), (answer) => {
              resolve(answer);
            });
          }),
        () => new Error("question failed"),
      ),
    ),
  );

// const calculateScore = (rounds: TRounds[], answers: readonly string[]) => {
//   pipe(
//     rounds,
//     RA.map(buildScoreTable),
//     RA.map((table) =>
//       pipe(
//         table,
//         Record.toEntries,
//         RA.map(([_, score]) => score),
//       ),
//     ),
//
//     RA.map((scores) =>
//       pipe(
//         scores,
//         RA.every((s) => s === scores[0]),
//       ),
//     ),
//   );
// };

const calculateScore = (rounds: TRounds[], answers: readonly string[]) => {
  pipe(
    rounds,
    RA.mapWithIndex((i, round) => {
      const answer = answers[i];
      const table = buildScoreTable(round);
    }),
  );
};

const runGame = (rounds: TRounds[]): RTE.ReaderTaskEither<Env, Error, readonly string[]> =>
  pipe(rounds, RA.traverse(RTE.ApplicativeSeq)(askQuestion));

const run = (rl: readline.Interface) =>
  pipe(loadSettings(), generateRound, (rounds) =>
    pipe(
      runGame(rounds),
      RTE.map((answers) => {
        calculateScore(rounds, answers);
      }),
    ),
  )({ rl: rl });

(async () => {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const main = run(rl);

  await main();
  rl.close();
})();
