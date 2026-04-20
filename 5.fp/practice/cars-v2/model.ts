import * as E from "fp-ts/lib/Either.js";
import { pipe } from "fp-ts/lib/function.js";
import * as O from "fp-ts/lib/Option.js";
import * as RA from "fp-ts/lib/ReadonlyArray.js";
import * as t from "io-ts";
import { readonlyNonEmptyArray } from "io-ts-types";
import readline from "node:readline";

import { isPositive } from "../cars/predicates.ts";

export const getPositiveNumberSchema = (name: string) => t.refinement(t.number, isPositive, name);

export const BaseSettingsSchema = t.type({
  allowedBrands: readonlyNonEmptyArray(t.string, "AllowedBrands"),
  allowedEngines: readonlyNonEmptyArray(t.string, "AllowedEngines"),
  carsInRound: getPositiveNumberSchema("CarsInRound"),
  maxMileage: getPositiveNumberSchema("MaxMileage"),
  maxYear: getPositiveNumberSchema("MaxYear"),
  mileageDifference: getPositiveNumberSchema("MileageDifference"),
  minYear: getPositiveNumberSchema("MinYear"),
  numRounds: getPositiveNumberSchema("NumRounds"),
});

type TBaseSettings = t.TypeOf<typeof BaseSettingsSchema>;

const validateRule = (condition: boolean, msg: string) => (condition ? O.some(msg) : O.none);
const validateSettings = (s: TBaseSettings) => [
  validateRule(s.minYear >= s.maxYear, "maxYear should be greater than minYear"),
  validateRule(
    s.mileageDifference >= s.maxMileage,
    "mileageDifference should be greater than maxMileage",
  ),
];
export const SettingsSchema = new t.Type(
  "Settings",
  BaseSettingsSchema.is,
  (u, c) =>
    pipe(
      BaseSettingsSchema.validate(u, c),
      E.chain((s) =>
        pipe(
          validateSettings(s),
          RA.compact,
          RA.match(
            () => t.success(s),
            (e) => t.failure(u, c, e.join(";")),
          ),
        ),
      ),
    ),
  t.identity,
);

export const CarSchema = t.type({
  brand: t.string,
  brandCoef: t.number,
  engine: t.string,
  engineCoef: t.number,
  id: t.number,
  mileage: t.number,
  year: t.number,
});

export type TSettings = t.TypeOf<typeof SettingsSchema>;
export type TCar = t.TypeOf<typeof CarSchema>;

export type JsonParseError = {
  error: Error;
  type: "JsonDecodeError";
};

export const RoundSchema = t.array(CarSchema);

export type TRounds = t.TypeOf<typeof RoundSchema>;

export type Env = {
  rl: readline.Interface;
};

export type ScoreTable = Record<number, number>;
