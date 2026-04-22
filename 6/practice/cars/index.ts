import { sequenceS } from "fp-ts/Apply";
import { flow } from "fp-ts/function";
import * as Console from "fp-ts/lib/Console";
import * as Eq from "fp-ts/lib/Eq.js";
import { pipe } from "fp-ts/lib/function.js";
import * as IO from "fp-ts/lib/IO.js";
import * as IOE from "fp-ts/lib/IOEither.js";
import * as J from "fp-ts/lib/Json.js";
import { concatAll } from "fp-ts/lib/Monoid.js";
import * as NonEmptyArray from "fp-ts/lib/NonEmptyArray.js";
import * as N from "fp-ts/lib/number.js";
import * as Ord from "fp-ts/lib/Ord.js";
import * as R from "fp-ts/lib/Random";
import * as RTE from "fp-ts/lib/ReaderTaskEither.js";
import * as t from "io-ts";
import * as tt from "io-ts-types";
import { readFileSync } from "node:fs";
import path from "node:path";
import readline from "node:readline";

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

type TRound = t.TypeOf<typeof Round>;

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
  // eslint-disable-next-line @typescript-eslint/unbound-method
  IOE.flatMap(flow(Settings.decode, IOE.fromEither)),
);

const generateCar = (settings: TSettings): IO.IO<TCar> =>
  pipe(
    {
      brand: R.randomElem(settings.allowedBrands),
      engine: R.randomElem(settings.allowedEngines),
      mileage: R.randomInt(0, settings.maxMileage),
      year: R.randomInt(settings.minYear, settings.maxYear),
    },
    sequenceS(IO.Apply),
  );

const generateRound = (settings: TSettings): IO.IO<TRound> =>
  pipe(
    IO.Do,
    IO.bind("car1", () => generateCar(settings)),
    IO.bind("car2", () => generateCar(settings)),
    IO.bind("answer", ({ car1, car2 }) =>
      pipe(
        getMoreExpensiveCar(car1, car2),
        IO.of,
        IO.map((answer) => (answer === car1 ? "first" : "second")),
      ),
    ),
  );

const generateRounds = (settings: TSettings) =>
  pipe(
    NonEmptyArray.range(0, settings.numRounds - 1),
    NonEmptyArray.map(generateRound(settings)),
    IOE.of,
  );

const printRound = (round: TRound): IO.IO<void> =>
  Console.log(
    `Which car is more expensive?\n1) ${JSON.stringify(
      round.car1,
    )}\n2) ${JSON.stringify(round.car2)}`,
  );

const askAnswer = () =>
  pipe(
    RTE.ask<readline.Interface>(),
    RTE.flatMap((rl) =>
      RTE.fromTask(
        () =>
          new Promise<string>((resolve) => {
            rl.question("", resolve);
          }),
      ),
    ),
    RTE.map((answer) => answer.trim()),
  );

const readAnswer = () =>
  pipe(
    RTE.fromIO(() => Console.log("Enter your answer: ")),
    RTE.flatMap(askAnswer),
  );

const mapUserAnswer = (answer: string) =>
  (
    ({
      1: "first",
      2: "second",
    }) as const
  )[answer];

const playRound = (round: TRound) =>
  pipe(
    round,
    printRound,
    RTE.fromIO,
    RTE.flatMap(readAnswer),
    RTE.map(mapUserAnswer),
    RTE.map((answer) => (answer === round.answer ? 1 : 0)),
  );

const runGame = flow(NonEmptyArray.map(playRound), RTE.sequenceSeqArray);

const finishGame = (score: number) =>
  pipe(
    RTE.ask<readline.Interface>(),
    RTE.flatMap((rl) =>
      RTE.fromIO(() => {
        rl.close();
      }),
    ),
    // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
    RTE.flatMap(flow(() => Console.log(`Your score is ${score}`), RTE.fromIO)),
  );

const calculateScore = concatAll(N.MonoidSum);

const program = pipe(
  loadSettings,
  IOE.flatMap(generateRounds),
  RTE.fromIOEither,
  RTE.flatMap(runGame),
  RTE.map(calculateScore),
  RTE.flatMap(finishGame),
);
