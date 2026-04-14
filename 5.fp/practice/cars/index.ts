import * as E from "fp-ts/lib/Either.js";
// import { concatAll } from "fp-ts/Monoid";
// import * as NonEmptyArray from "fp-ts/NonEmptyArray";
// import * as Ord from "fp-ts/Ord";
// import * as R from "fp-ts/Random";
// import * as RTE from "fp-ts/ReaderTaskEither";
import { flow, pipe } from "fp-ts/lib/function.js";
// import { sequenceS } from "fp-ts/Apply";
// import * as Console from "fp-ts/Console";
// import * as Eq from "fp-ts/Eq";
// import * as IO from "fp-ts/IO";
import * as IOE from "fp-ts/lib/IOEither.js";
// import * as J from "fp-ts/Json";
import * as J from "fp-ts/lib/Json.js";
// import * as N from "fp-ts/number";
// import * as t from "io-ts";
// import * as tt from "io-ts-types";
// import { readFileSync } from "node:fs";
// import path from "node:path";
// import readline from "node:readline";
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
import * as t from "io-ts";
import { readFileSync } from "node:fs";
import * as readline from "node:readline";

const getRandomArbitrary = (min: number, max: number) => {
  return Math.random() * (max - min) + min;
};

const lessOrEqual = (a: number) => (b: number) => b <= a;
const greaterOrEqual = (a: number) => (b: number) => b >= a;
const isPositive = (n: number) => greaterOrEqual(0)(n);

const maxMileage = lessOrEqual(100000);
const minYear = greaterOrEqual(2000);
const maxYear = lessOrEqual(2026);

const Settings = t.type({
  allowedBrands: t.tuple([t.literal("Ford"), t.literal("Audi"), t.literal("BMW")]),
  allowedEngines: t.tuple([t.literal("diesel"), t.literal("petrol"), t.literal("electric")]),
  maxMileage: t.refinement(t.number, maxMileage, "MaxMileage"),
  maxYear: t.refinement(t.number, maxYear, "MaxYear"),
  mileageDifference: t.refinement(t.number, isPositive, "MileageDifference"),
  minYear: t.refinement(t.number, minYear),
  numRounds: t.number,
});

type Settings = t.TypeOf<typeof Settings>;

type Car = {
  brand: string;
  engine: string;
  year: number;
};

const loadSettings = pipe(
  readFileSync("./settings.json", "utf8"),
  J.parse,
  E.chainW((a) => Settings.decode(a)),
);

const generateRandomCar = (settings: Settings): Car => {
  return {
    brand: settings.allowedBrands[getRandomArbitrary(0, settings.allowedBrands.length - 1)],
    engine: settings.allowedEngines[getRandomArbitrary(0, settings.allowedEngines.length - 1)],
    year: getRandomArbitrary(settings.minYear, settings.maxYear),
  };
};

const generateRound = (settings: E.Either<unknown, Settings>) => {
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
