import * as A from "fp-ts/lib/Array.js";
import * as E from "fp-ts/lib/Either";
import { pipe } from "fp-ts/lib/function.js";
import * as IO from "fp-ts/lib/IO.js";
import * as IOE from "fp-ts/lib/IOEither";
import { randomInt } from "fp-ts/lib/Random";
import * as R from "fp-ts/lib/Random.js";

import { TCar, TRounds, TSettings } from "./model.ts";

export const getRandomArbitrary = (min: number, max: number) => {
  return R.random() * (max - min) + min;
};

export const lessOrEqual = (a: number) => (b: number) => b <= a;
export const greaterOrEqual = (a: number) => (b: number) => b >= a;
export const isPositive = (n: number) => greaterOrEqual(0)(n);

export const maxMileage = lessOrEqual(100000);
export const minYear = greaterOrEqual(2000);
export const maxYear = lessOrEqual(2026);

export const generateRandomCar = (settings: TSettings, mileage: number): TCar => ({
  brand: R.randomElem(settings.allowedBrands)(),
  engine: R.randomElem(settings.allowedEngines)(),
  mileage,
  year: R.randomInt(settings.minYear, settings.maxYear)(),
});

export const generateRounds = (settings: TSettings) => {
  const mileage1 = R.randomInt(0, settings.maxMileage)();

  const minMileage2 = Math.max(0, mileage1 - settings.mileageDifference);
  const maxMileage2 = Math.min(settings.maxMileage, mileage1 + settings.mileageDifference);
  const mileage2 = R.randomInt(minMileage2, maxMileage2)();

  return A.makeBy(settings.numRounds, () => ({
    first: generateRandomCar(settings, mileage1),
    second: generateRandomCar(settings, mileage2),
  }));
};

export const createCarLine = (car: TCar) =>
  `Brand: ${car.brand}, engine: ${car.engine}, year: ${car.year.toString()}, milleage: ${car.mileage}`;

export const createQuestion = (round: TRounds) =>
  `
    Which car is more expensive?\n
    1) ${createCarLine(round.first)}
    2) ${createCarLine(round.second)}
  `;
