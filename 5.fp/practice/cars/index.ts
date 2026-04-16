import * as Console from "fp-ts/lib/Console.js";
import * as E from "fp-ts/lib/Either.js";
import { pipe } from "fp-ts/lib/function.js";
import * as J from "fp-ts/lib/Json.js";
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
import readline from "node:readline";

import { JsonParseError, SettingsSchema, TRounds, TSettings } from "./model.ts";
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

const generateRound = (settings: TSettings) => pipe(settings, generateRounds);

const runGame = (rl: readline.Interface) => (rounds: TRounds[]) => {
  const answers = [];

  rounds.forEach((round) => {
    console.log(buildScoreTable(round));

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

  const main = run(rl);

  // await main();
})();
