import * as t from "io-ts";
import readline from "node:readline";

import { isPositive } from "../cars/predicates.ts";

export const getPositiveNumberSchema = (name: string) => t.refinement(t.number, isPositive, name);

export const SettingsSchema = t.type({
  allowedBrands: t.array(t.string),
  allowedEngines: t.array(t.string),
  carsInRound: getPositiveNumberSchema("CarsInRound"),
  maxMileage: getPositiveNumberSchema("MaxMileage"),
  maxYear: getPositiveNumberSchema("MaxYear"),
  mileageDifference: getPositiveNumberSchema("MileageDifference"),
  minYear: getPositiveNumberSchema("MinYear"),
  numRounds: getPositiveNumberSchema("NumRounds"),
});

export const CarSchema = t.type({
  brand: t.string,
  engine: t.string,
  id: t.number,
  mileage: t.number,
  year: t.number,
});

export type TSettings = t.TypeOf<typeof SettingsSchema>;
export type TCar = t.TypeOf<typeof CarSchema>;

export type TCarPair = [TCar, TCar];

export type JsonParseError = {
  error: Error;
  type: "JsonDecodeError";
};

export const RoundSchema = t.array(CarSchema);

export type Env = {
  rl: readline.Interface;
};
import * as t from "io-ts";
import readline from "node:readline";

import { isPositive } from "../cars/predicates.ts";

export const getPositiveNumberSchema = (name: string) => t.refinement(t.number, isPositive, name);

export const SettingsSchema = t.type({
  allowedBrands: t.array(t.string),
  allowedEngines: t.array(t.string),
  carsInRound: getPositiveNumberSchema("CarsInRound"),
  maxMileage: getPositiveNumberSchema("MaxMileage"),
  maxYear: getPositiveNumberSchema("MaxYear"),
  mileageDifference: getPositiveNumberSchema("MileageDifference"),
  minYear: getPositiveNumberSchema("MinYear"),
  numRounds: getPositiveNumberSchema("NumRounds"),
});

export const CarSchema = t.type({
  brand: t.string,
  engine: t.string,
  id: t.number,
  mileage: t.number,
  year: t.number,
});

export type TSettings = t.TypeOf<typeof SettingsSchema>;
export type TCar = t.TypeOf<typeof CarSchema>;

export type TCarPair = [TCar, TCar];

export type JsonParseError = {
  error: Error;
  type: "JsonDecodeError";
};

export const RoundSchema = t.array(CarSchema);

export type Env = {
  rl: readline.Interface;
};
