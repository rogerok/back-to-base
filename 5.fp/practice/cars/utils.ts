import * as E from "fp-ts/lib/Either";
import * as IOE from "fp-ts/lib/IOEither";
import * as R from "fp-ts/lib/Random.js";

import { JsonParseError, TCar, TRounds, TSettings } from "./model.ts";

export const getRandomArbitrary = (min: number, max: number) => {
  return R.random() * (max - min) + min;
};

export const lessOrEqual = (a: number) => (b: number) => b <= a;
export const greaterOrEqual = (a: number) => (b: number) => b >= a;
export const isPositive = (n: number) => greaterOrEqual(0)(n);

export const maxMileage = lessOrEqual(100000);
export const minYear = greaterOrEqual(2000);
export const maxYear = lessOrEqual(2026);

export const generateRandomCar = (settings: TSettings): TCar => ({
  brand: ings.allowedBrands[R.randomRange(0, settings.allowedBrands.length - 1)],
  engine: settings.allowedEngines[getRandomArbitrary(0, settings.allowedEngines.length - 1)],
  year: getRandomArbitrary(settings.minYear, settings.maxYear),
});

export const generateRounds = (settings: TSettings): TRounds[] => {
  return Array.from({ length: settings.numRounds }).map(() => ({
    first: generateRandomCar(settings),
    second: generateRandomCar(settings),
  }));
};
