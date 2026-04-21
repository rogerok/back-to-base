import { sequenceS } from "fp-ts/Apply";
import * as Console from "fp-ts/Console";
import * as Eq from "fp-ts/Eq";
import { flow, pipe } from "fp-ts/function";
import * as IO from "fp-ts/IO";
import * as IOE from "fp-ts/IOEither";
import * as J from "fp-ts/Json";
import { concatAll } from "fp-ts/Monoid";
import * as NonEmptyArray from "fp-ts/NonEmptyArray";
import * as N from "fp-ts/number";
import * as Ord from "fp-ts/Ord";
import * as R from "fp-ts/Random";
import * as RTE from "fp-ts/ReaderTaskEither";
import * as t from "io-ts";
import * as tt from "io-ts-types";
import { readFileSync } from "node:fs";
import path from "node:path";
import readline from "node:readline";

/**
 * Напишем простую игру - оценщик автомобилей.
 * Игра состоит из 10 раундов. Если в раунде игрок оценивает верно, то получает +1 очко, иначе - ничего.
 *
 * Настройки игры читаются из settings.json.
 * В нашей игре машины дороже когда
 * - они новее
 * - у них более дорогая марка(BMW > Audi > Ford)
 * - у них более дорогой двигатель(дизель > бензин > электро)
 * - у них меньше пробег(с допустимой разницей в 100 км)
 */

// eslint-disable-next-line unicorn/prefer-module
const settingsPath = path.join(__dirname, "settings.json");

type PricedCar = {
  brandPrice: CarBrandRate;
  enginePrice: CarEngineRate;
} & Omit<TCar, "brand" | "engine">;

const ALLOWED_MILAGE_DIFF = 100;

const CarEngines = t.union([t.literal("diesel"), t.literal("petrol"), t.literal("electric")]);
const CarBrands = t.union([t.literal("Ford"), t.literal("Audi"), t.literal("BMW")]);

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

const Car = t.type({
  brand: CarBrands,
  engine: t.string.pipe(tt.JsonFromString).pipe(CarEngines),
  mileage: t.number,
  year: t.number,
});
type TCar = t.TypeOf<typeof Car>;

const Round = t.type({
  answer: t.union([t.literal("first"), t.literal("second")]),
  car1: Car,
  car2: Car,
});
type TRound = t.TypeOf<typeof Round>;

enum CarEngineRate {
  electric = 1,
  petrol = 2,
  diesel = 3,
}
enum CarBrandRate {
  Ford = 1,
  Audi = 2,
  BMW = 3,
}

const mapCar = (car: TCar): PricedCar => ({
  ...car,
  brandPrice: CarBrandRate[car.brand],
  enginePrice: CarEngineRate[car.engine],
});

const eqMilage: Eq.Eq<number> = {
  equals: (x, y) => Math.abs(x - y) <= ALLOWED_MILAGE_DIFF,
};
const ordMilage: Ord.Ord<number> = {
  compare: (x, y) => (eqMilage.equals(x, y) ? 0 : x < y ? -1 : 1),
  equals: eqMilage.equals,
};

const M = Ord.getMonoid<PricedCar>();

const ordByYear = pipe(
  N.Ord,
  Ord.contramap((car: PricedCar) => car.year),
);
const ordByMileage = pipe(
  ordMilage,
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
const complexOrd = makeComplexOrd([ordByYear, ordByBrand, ordByEngine, ordByMileage]);

const getMoreExpensiveCar = (car1: TCar, car2: TCar): TCar =>
  complexOrd.compare(mapCar(car1), mapCar(car2)) > 0 ? car1 : car2;

class ReadSettingsError extends Error {
  constructor(message: string) {
    super(message);
  }
}

const readSettings = IOE.tryCatch(
  () => readFileSync(settingsPath, "utf8"),
  (reason) => new ReadSettingsError(String(reason)),
);

const loadSettings = pipe(
  readSettings,
  IOE.map(J.parse),
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

void (async () => {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const run = program(rl);

  await run();
})();
