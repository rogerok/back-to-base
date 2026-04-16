import * as A from "fp-ts/lib/Array.js";
import * as boolean from "fp-ts/lib/boolean.js";
import * as E from "fp-ts/lib/Either.js";
import { pipe } from "fp-ts/lib/function";
import { concatAll } from "fp-ts/lib/Monoid.js";
import * as NEA from "fp-ts/lib/NonEmptyArray.js";
import * as N from "fp-ts/lib/number.js";
import * as Option from "fp-ts/lib/Option.js";
import * as O from "fp-ts/lib/Option.js";
import * as Ord from "fp-ts/lib/Ord.js";
import * as Ordering from "fp-ts/lib/Ordering.js";
import * as R from "fp-ts/lib/Random.js";
import * as RTE from "fp-ts/lib/ReaderTaskEither";
import * as RA from "fp-ts/lib/ReadonlyArray.js";
import * as Record from "fp-ts/lib/Record.js";
import * as TE from "fp-ts/lib/TaskEither";
import { readFileSync } from "node:fs";

import {
  Env,
  priceBrandCoefficient,
  priceEngineCoefficient,
  ScoreTable,
  TCar,
  TCarPair,
  TRounds,
  TSettings,
} from "./model.ts";
import {
  greaterOrEqual,
  isPositive,
  lessOrEqual,
  maxMileage,
  maxYear,
  minYear,
} from "./predicates.ts";

export { greaterOrEqual, isPositive, lessOrEqual, maxMileage, maxYear, minYear };

export const generateRandomCar = (settings: TSettings, mileage: number, id: number): TCar => ({
  brand: R.randomElem(settings.allowedBrands)(),
  engine: R.randomElem(settings.allowedEngines)(),
  id,
  mileage,
  year: R.randomInt(settings.minYear, settings.maxYear)(),
});

export const generateRounds = (settings: TSettings): TRounds[] => {
  const maxStart = Math.max(0, settings.maxMileage - settings.mileageDifference);
  const start = R.randomInt(0, maxStart)();
  const end = Math.min(settings.maxMileage, start + settings.mileageDifference);

  const mileages = A.makeBy(settings.carsInRound, () => R.randomInt(start, end)());

  return A.makeBy(settings.numRounds, () =>
    A.makeBy(settings.carsInRound, (i) => generateRandomCar(settings, mileages[i], i + 1)),
  );
};

export const createCarLine = (car: TCar) =>
  `${car.id.toString()}) Brand: ${car.brand}, engine: ${car.engine}, year: ${car.year.toString()}, milleage: ${car.mileage.toString()}`;

export const createQuestion = (round: TRounds) =>
  `Which car is more expensive?\n
  \n${pipe(round, RA.map(createCarLine)).join("\n")}
   \n${(round.length + 1).toString()}) Equal
  `;

export const getBrandCoef = (car: TCar) => priceBrandCoefficient[car.brand];
export const getEngineCoef = (car: TCar) => priceEngineCoefficient[car.engine];
const getCoef = (car: TCar) => N.SemigroupSum.concat(getBrandCoef(car), getEngineCoef(car));

const ordByYear: Ord.Ord<TCar> = pipe(
  N.Ord,
  Ord.contramap((car) => car.year),
);

const ordByMileage: Ord.Ord<TCar> = pipe(
  N.Ord,
  Ord.contramap((car) => car.mileage),
);

const isYounger = Ord.gt(ordByYear);
const isMileageLess = Ord.lt(ordByMileage);

const getBoolBonus = (condition: boolean): number =>
  pipe(
    condition,
    boolean.match(
      () => 0,
      () => 1,
    ),
  );

export const duelScore = (first: TCar, second: TCar): number =>
  concatAll(N.MonoidSum)([
    getCoef(first),
    getBoolBonus(isYounger(first, second)),
    getBoolBonus(isMileageLess(first, second)),
  ]);

export const toPairs = (cars: ReadonlyArray<TCar>): ReadonlyArray<TCarPair> =>
  pipe(
    cars,
    RA.chainWithIndex((i, a) =>
      pipe(
        cars,
        RA.dropLeft(i + 1),
        RA.map((b): TCarPair => [a, b]),
      ),
    ),
  );

const addPoints = (table: ScoreTable, id: number, score: number) => {
  const key = id.toString();
  return Record.upsertAt(
    key,
    pipe(
      Record.lookup(key, table),
      Option.match(
        () => score,
        (prev) => N.SemigroupSum.concat(prev, score),
      ),
    ),
  )(table);
};

export const buildScoreTable = (cars: TCar[]) =>
  pipe(
    toPairs(cars),
    RA.reduce({} as ScoreTable, (table, [a, b]) =>
      pipe(
        N.Ord.compare(duelScore(a, b), duelScore(b, a)),
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

export const readFile = (path: string, encoding: BufferEncoding) =>
  E.tryCatch(() => readFileSync(path, { encoding }), E.toError);

export const ordByScore: Ord.Ord<[string, number]> = pipe(
  N.Ord,
  Ord.contramap(([_, score]: [string, number]) => score),
);

export const findWinner = (table: ScoreTable): string =>
  pipe(
    table,
    Record.toEntries,
    NEA.fromArray,
    O.map(NEA.max(ordByScore)),
    O.map(([id]) => id),
    O.getOrElse(() => ""),
  );

export const deriveCorrectAnswer = (table: ScoreTable, roundLength: number): string => {
  const scores = pipe(
    table,
    Record.toEntries,
    RA.map(([_, score]) => score),
  );

  return pipe(
    scores,
    RA.every((s) => s === scores[0]),
    (isEqual) => (isEqual ? N.SemigroupSum.concat(roundLength, 1).toString() : findWinner(table)),
  );
};
export const generateRound = (settings: TSettings) => pipe(settings, generateRounds);

export const askQuestion = (car: TRounds): RTE.ReaderTaskEither<Env, Error, string> =>
  pipe(
    RTE.ask<Env>(),
    RTE.flatMapTaskEither(({ rl }) =>
      TE.tryCatch(
        () =>
          new Promise<string>((resolve) => {
            rl.question(createQuestion(car), (answer) => {
              resolve(answer);
            });
          }),
        () => new Error("question failed"),
      ),
    ),
  );
