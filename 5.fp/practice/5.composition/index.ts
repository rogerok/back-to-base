import { last, map, pipe, piped, prop, sortBy } from "remeda";

type Car = {
  dollar_value: number;
  horsepower: number;
  in_stock: boolean;
  name: string;
};

const car: Car = {
  dollar_value: 1850000,
  horsepower: 750,
  in_stock: true,
  name: "Aston Martin One-77",
};

const arr: Car[] = [
  {
    dollar_value: 100,
    horsepower: 7,
    in_stock: true,
    name: "Lada",
  },
  {
    dollar_value: 180,
    horsepower: 50,
    in_stock: false,
    name: "Chevro",
  },
  {
    dollar_value: 1850000,
    horsepower: 2,
    in_stock: true,
    name: "Aston Martin One-77",
  },
];

const isLastInStack = piped(last<Car[]>, prop("in_stock"));

const average = (xs: number[]): number => xs.reduce((acc, x) => acc + x, 0) / xs.length;

const averageDollarValue = (cars: Car[]) => pipe(cars, map(prop("dollar_value")), average);

console.log(averageDollarValue([car]));

const fastestCar = piped(
  (cars: Car[]) => sortBy(cars, prop("horsepower")),
  last,
  (car) => `${car.name} is the fastest`,
);

console.log(fastestCar(arr));
