import * as t from "io-ts";

import { isPositive, maxMileage, maxYear, minYear } from "./utils.ts";

export const BMW = t.literal("BMW");
export const Audi = t.literal("Audi");
export const Ford = t.literal("Ford");

export const Diesel = t.literal("diesel");
export const Petrol = t.literal("petrol");
export const Electric = t.literal("electric");

export const Brand = t.union([BMW, Audi, Ford]);
export const Engine = t.union([Diesel, Petrol, Electric]);
export const BrandsTuple = t.tuple([BMW, Audi, Ford]);
export const EnginesTuple = t.tuple([Diesel, Petrol, Electric]);

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
  id: t.number,
  mileage: t.number,
  year: t.number,
});

export type TSettings = t.TypeOf<typeof SettingsSchema>;
export type TCar = t.TypeOf<typeof CarSchema>;

export const RoundSchema = t.type({
  first: CarSchema,
  second: CarSchema,
});

export type TRounds = t.TypeOf<typeof RoundSchema>;

export type TBrand = t.TypeOf<typeof Brand>;
export type TEngine = t.TypeOf<typeof Engine>;

export type JsonParseError = {
  error: Error;
  type: "JsonDecodeError";
};

export type TPriceBrandCoefficient = Record<TCar["brand"], number>;
export type TPriceEngineCoefficient = Record<TCar["engine"], number>;

export const priceBrandCoefficient: TPriceBrandCoefficient = {
  [Audi.value]: 2,
  [BMW.value]: 3,
  [Ford.value]: 1,
};
export const priceEngineCoefficient: TPriceEngineCoefficient = {
  [Diesel.value]: 2,
  [Electric.value]: 3,
  [Petrol.value]: 1,
};
