import * as A from "fp-ts/lib/Array.js";
import * as boolean from "fp-ts/lib/boolean.js";
import * as E from "fp-ts/lib/Either.js";
import { pipe } from "fp-ts/lib/function.js";
import * as IOEither from "fp-ts/lib/IOEither.js";
import * as M from "fp-ts/lib/Monoid.js";
import * as NEA from "fp-ts/lib/NonEmptyArray.js";
import * as N from "fp-ts/lib/number";
import * as number from "fp-ts/lib/number.js";
import * as O from "fp-ts/lib/Option.js";
import * as Ord from "fp-ts/lib/Ord.js";
import * as Ordering from "fp-ts/lib/Ordering.js";
import * as R from "fp-ts/lib/Random.js";
import * as RTE from "fp-ts/lib/ReaderTaskEither.js";
import * as RA from "fp-ts/lib/ReadonlyArray.js";
import * as Record from "fp-ts/lib/Record.js";
import * as TE from "fp-ts/lib/TaskEither.js";
import { readFileSync } from "node:fs";

import { Env, ScoreTable, TCar, TRounds, TSettings } from "./model.ts";

export const readFile = (path: string, encoding: BufferEncoding) =>
  pipe(IOEither.tryCatch(() => readFileSync(path, encoding), E.toError));

export const generateRandomCar = (s: TSettings, id: number): TCar => {
  const brandIdx = R.randomInt(0, s.allowedBrands.length - 1)();
  const engineIdx = R.randomInt(0, s.allowedEngines.length - 1)();

  return {
    brand: s.allowedBrands[brandIdx],
    brandCoef: brandIdx + 1,
    engine: s.allowedEngines[engineIdx],
    engineCoef: engineIdx + 1,
    id,
    mileage: Math.min(s.maxMileage, R.randomInt(0, s.maxMileage)() + s.mileageDifference),
    year: R.randomInt(s.minYear, s.maxYear)(),
  };
};

export const buildRounds = (s: TSettings): TRounds[] =>
  A.makeBy(s.numRounds, () => A.makeBy(s.carsInRound, (i) => generateRandomCar(s, i + 1)));
export const generateRound = (settings: TSettings) => pipe(settings, buildRounds);

export const createCarLine = (car: TCar) =>
  `${car.id.toString()}) Brand: ${car.brand}, engine: ${car.engine}, year: ${car.year.toString()}, milleage: ${car.mileage.toString()}`;

export const createQuestion = (round: TRounds) =>
  `Which car is more expensive?\n
  \n${pipe(round, RA.map(createCarLine)).join("\n")}
${(round.length + 1).toString()}) Equal
  `;

export const ordByYear: Ord.Ord<TCar> = pipe(
  number.Ord,
  Ord.contramap((car) => car.year),
);

const ordByMileage: Ord.Ord<TCar> = pipe(
  N.Ord,
  Ord.contramap((car) => car.mileage),
);

const isYounger = Ord.gt(ordByYear);
const isMileageLess = Ord.gt(ordByMileage);

export const getBoolBonus = (condition: boolean): number =>
  pipe(
    condition,
    boolean.match(
      () => 0,
      () => 1,
    ),
  );

export const duelScore = (a: TCar, b: TCar) =>
  M.concatAll(number.MonoidSum)([
    a.brandCoef,
    b.brandCoef,
    getBoolBonus(isYounger(a, b)),
    getBoolBonus(isMileageLess(a, b)),
  ]);

const addPoints = (table: ScoreTable, id: number, score: number) => {
  const key = id.toString();

  return Record.upsertAt(
    key,
    pipe(
      Record.lookup(key, table),
      O.match(
        () => score,
        (prev) => prev + score,
      ),
    ),
  )(table);
};

export const toPairs = (cars: ReadonlyArray<TCar>) =>
  pipe(
    cars,
    RA.chainWithIndex((i, a) =>
      pipe(
        cars,
        RA.dropLeft(i + 1),
        RA.map((b) => [a, b]),
      ),
    ),
  );

export const buildScoreTable = (cars: TCar[]) =>
  pipe(
    toPairs(cars),
    RA.reduce({} as ScoreTable, (table, [a, b]) =>
      pipe(
        number.Ord.compare(duelScore(a, b), duelScore(b, a)),
        Ordering.match(
          () =>
            pipe(
              table,
              (t) => addPoints(t, a.id, 0),
              (t) => addPoints(t, b.id, 1),
            ),
          () =>
            pipe(
              table,
              (t) => addPoints(t, a.id, 0.5),
              (t) => addPoints(t, b.id, 0.5),
            ),
          () =>
            pipe(
              table,
              (t) => addPoints(t, a.id, 1),
              (t) => addPoints(t, b.id, 0),
            ),
        ),
      ),
    ),
  );

export const ordByScore: Ord.Ord<[string, number]> = pipe(
  number.Ord,
  Ord.contramap(([_, score]) => score),
);

export const findWinner = (table: ScoreTable) =>
  pipe(
    table,
    Record.toEntries,
    NEA.fromArray,
    O.map(NEA.max(ordByScore)),
    O.map(([id]) => id),
    O.getOrElse(() => ""),
  );

export const deriveCorrectAnswer = (table: ScoreTable, roundLength: number) => {
  const scores = pipe(
    table,
    Record.toEntries,
    RA.map(([_, score]) => score),
  );

  return pipe(
    scores,
    RA.every((s) => number.Eq.equals(s, scores[0])),
    (eq) => (eq ? (roundLength + 1).toString() : findWinner(table)),
  );
};

export const askQuestion = (car: TRounds): RTE.ReaderTaskEither<Env, Error, string> =>
  pipe(
    RTE.ask<Env>(),
    RTE.flatMapTaskEither(({ rl }) =>
      TE.tryCatch(
        () =>
          new Promise<string>((resolve) => {
            rl.question(createQuestion(car), resolve);
          }),
        () => new Error("question failed"),
      ),
    ),
  );
