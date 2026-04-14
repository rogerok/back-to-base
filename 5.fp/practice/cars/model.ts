import * as t from "io-ts";

import { isPositive, maxMileage, maxYear, minYear } from "./utils.ts";

export const Brand = t.union([t.literal("BMW"), t.literal("Audi"), t.literal("Ford")]);
export const Engine = t.union([t.literal("diesel"), t.literal("petrol"), t.literal("electric")]);
export const BrandsTuple = t.tuple([t.literal("BMW"), t.literal("Audi"), t.literal("Ford")]);
export const EnginesTuple = t.tuple([
  t.literal("diesel"),
  t.literal("petrol"),
  t.literal("electric"),
]);

export const SettingsSchema = t.type({
  allowedBrands: BrandsTuple,
  allowedEngines: EnginesTuple,
  maxMileage: t.refinement(t.number, maxMileage, "MaxMileage"),
  maxYear: t.refinement(t.number, maxYear, "MaxYear"),
  mileageDifference: t.refinement(t.number, isPositive, "MileageDifference"),
  minYear: t.refinement(t.number, minYear),
  numRounds: t.number,
});

export const CarSchema = t.type({
  brand: Brand,
  engine: Engine,
  year: t.number,
});

export type TSettings = t.TypeOf<typeof SettingsSchema>;
export type TCar = t.TypeOf<typeof CarSchema>;

export const RoundSchema = t.type({
  first: CarSchema,
  second: CarSchema,
});

export type TRounds = t.TypeOf<typeof RoundSchema>;

export type JsonParseError = {
  error: Error;
  type: "JsonDecodeError";
};
