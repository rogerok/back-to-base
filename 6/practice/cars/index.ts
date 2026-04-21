import { flow } from "fp-ts/function";
import * as Eq from "fp-ts/lib/Eq.js";
import { pipe } from "fp-ts/lib/function.js";
import * as IOE from "fp-ts/lib/IOEither.js";
import * as IO from "fp-ts/lib/IO.js";
import * as J from "fp-ts/lib/Json.js";
import { concatAll } from "fp-ts/lib/Monoid.js";
import * as N from "fp-ts/lib/number.js";
import * as Ord from "fp-ts/lib/Ord.js";
import * as t from "io-ts";
import * as tt from "io-ts-types";
import { readFileSync } from "node:fs";
import path from "node:path";
import { string } from "zod";

const settingsPath = path.join(__dirname, "settings.json");

const ALLOWED_MILAGE_DIFF = 100;

const CarEngines = t.union([t.literal("diesel"), t.literal("petrol"), t.literal("electric")]);
const CarBrands = t.union([t.literal("Ford"), t.literal("Audi"), t.literal("BMW")]);

const Car = t.type({
  brand: CarBrands,
  engine: t.string.pipe(tt.JsonFromString).pipe(CarEngines),
  mileage: t.number,
  year: t.number,
});
type TCar = t.TypeOf<typeof Car>;

const Settings = t.type({
  allowedBrands: tt.readonlyNonEmptyArray(CarBrands),
  allowedEngines: tt.readonlyNonEmptyArray(CarEngines),
  maxMileage: t.number,
  maxYear: t.number,
  mileageDifference: t.number,
  minYear: t.number,
  numRounds: t.number,
});
type TSettings = t.TypeOf<typeof Settings>;

const Round = t.type({
  answer: t.union([t.literal("first"), t.literal("second")]),
  car1: Car,
  car2: Car,
});

enum CarBrandRate {
  Ford = 1,
  Audi = 2,
  BMW = 3,
}

enum CarEngineRate {
  electric = 1,
  petrol = 2,
  diesel = 3,
}

type PricedCar = {
  brandPrice: CarBrandRate;
  enginePrice: CarEngineRate;
} & Omit<TCar, "brand" | "engine">;

const mapCar = (car: TCar): PricedCar => ({
  ...car,
  brandPrice: CarBrandRate[car.brand],
  enginePrice: CarEngineRate[car.engine],
});

const eqMileage: Eq.Eq<number> = {
  equals: (x, y) => Math.abs(x - y) <= ALLOWED_MILAGE_DIFF,
};
const ordMileage: Ord.Ord<number> = {
  compare: (x, y) => (eqMileage.equals(x, y) ? 0 : x < y ? -1 : 1),
  equals: eqMileage.equals,
};

const M = Ord.getMonoid<PricedCar>();

const ordByYear = pipe(
  N.Ord,
  Ord.contramap((car: PricedCar) => car.year),
);
const ordByMileage = pipe(
  ordMileage,
  Ord.reverse,
  Ord.contramap((car: PricedCar) => car.mileage),
);
const ordByEngine = pipe(
  N.Ord,
  Ord.contramap((car: PricedCar) => car.enginePrice),
);
const ordByBrand = pipe(
  N.Ord,
  Ord.contramap((car: PricedCar) => car.brandPrice),
);

const makeComplexOrd = concatAll(M);
const complexOrd = makeComplexOrd([ordByYear, ordByBrand, ordByMileage, ordByEngine]);

const getMoreExpensiveCar = (car1: TCar, car2: TCar): TCar =>
  complexOrd.compare(mapCar(car1), mapCar(car2)) > 0 ? car1 : car2;

class ReadSettingsError extends Error {
  constructor(msg: string) {
    super(msg);
  }
}

const readSettings = IOE.tryCatch(
  () => readFileSync(settingsPath, "utf-8"),
  (reason) => new ReadSettingsError(String(reason)),
);

const loadSettings = pipe(
  readSettings,
  IOE.map(J.parse),
  IOE.flatMap(flow(Settings.decode, IOE.fromEither)),
);

const generateCar = (settings: TSettings): IO.IO<TRound> => (

)