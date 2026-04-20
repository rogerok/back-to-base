import * as Console from "fp-ts/lib/Console.js";
import * as E from "fp-ts/lib/Either.js";
import { pipe } from "fp-ts/lib/function.js";
import * as IOEither from "fp-ts/lib/IOEither.js";
import * as J from "fp-ts/lib/Json.js";
import * as RTE from "fp-ts/lib/ReaderTaskEither.js";
import * as RA from "fp-ts/lib/ReadonlyArray.js";
import * as string from "fp-ts/lib/string.js";
import * as PathReporter from "io-ts/lib/PathReporter.js";
import readline from "node:readline";

import { Env, JsonParseError, SettingsSchema, TRounds } from "./model.ts";
import {
  askQuestion,
  buildScoreTable,
  deriveCorrectAnswer,
  generateRound,
  readFile,
} from "./utils.ts";

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

export const calculateScore = (rounds: TRounds[], answers: readonly string[]) =>
  pipe(
    rounds,
    RA.mapWithIndex((i, round) => ({
      answer: answers[i],
      correct: deriveCorrectAnswer(buildScoreTable(round), round.length),
    })),
    RA.filter(({ answer, correct }) => string.Eq.equals(answer, correct)),
    RA.size,
  );

const runGame = (rounds: TRounds[]): RTE.ReaderTaskEither<Env, Error, readonly string[]> =>
  pipe(rounds, RA.traverse(RTE.ApplicativeSeq)(askQuestion));

const finishGame = (score: number): RTE.ReaderTaskEither<Env, Error, void> =>
  RTE.fromIO(Console.log(`Your score: ${score.toString()}`));

const run = (rl: readline.Interface) =>
  pipe(
    RTE.fromIOEither(loadSettings()),
    RTE.map(generateRound),
    RTE.flatMap((rounds) =>
      pipe(
        runGame(rounds),
        RTE.map((answers) => calculateScore(rounds, answers)),
        RTE.flatMap(finishGame),
      ),
    ),
  )({ rl });

void (async () => {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  await run(rl)();
  rl.close();
})();
