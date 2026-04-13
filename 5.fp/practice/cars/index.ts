import * as E from "fp-ts/lib/Either.js";
// import { concatAll } from "fp-ts/Monoid";
// import * as NonEmptyArray from "fp-ts/NonEmptyArray";
// import * as Ord from "fp-ts/Ord";
// import * as R from "fp-ts/Random";
// import * as RTE from "fp-ts/ReaderTaskEither";
import { pipe } from "fp-ts/lib/function.js";
// import { sequenceS } from "fp-ts/Apply";
// import * as Console from "fp-ts/Console";
// import * as Eq from "fp-ts/Eq";
// import * as IO from "fp-ts/IO";
// import * as IOE from "fp-ts/IOEither";
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

const lessOrEqual = (a: number) => (b: number) => b <= a;
const greaterOrEqual = (a: number) => (b: number) => b >= a;
const isPositive = (n: number) => greaterOrEqual(0)(n);

const maxMileage = lessOrEqual(100000);
const minYear = greaterOrEqual(2000);
const maxYear = lessOrEqual(2026);

const Settings = t.type({
  allowedBrands: t.array(t.string),
  allowedEngines: t.array(t.string),
  maxMileage: t.refinement(t.number, maxMileage, "MaxMileage"),
  maxYear: t.refinement(t.number, maxYear, "MaxYear"),
  mileageDifference: t.refinement(t.number, isPositive, "MileageDifference"),
  minYear: t.refinement(t.number, minYear),
  numRounds: t.number,
});

type Settings = t.TypeOf<typeof Settings>;

const loadSettings = () => {
  const f = pipe(readFileSync("./settings.json", "utf8"), J.parse);
  const d = E.chain(f);
};

loadSettings();

const run = pipe(loadSettings);

(async () => {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  run();

  // const main = run(rl);

  // await main();
})();
