import { pipe } from "fp-ts/lib/function";
import { concatAll } from "fp-ts/lib/Monoid.js";
import * as N from "fp-ts/lib/number.js";
import * as O from "fp-ts/lib/Option.js";
import * as Ord from "fp-ts/lib/Ord.js";
import * as RA from "fp-ts/lib/ReadonlyArray.js";
import * as RNA from "fp-ts/lib/ReadonlyNonEmptyArray.js";

interface Product {
  category: string;
  id: number;
  inStock: boolean;
  name: string;
  price: number;
}

const products: Product[] = [
  { category: "electronics", id: 1, inStock: true, name: "Laptop", price: 999 },
  { category: "electronics", id: 2, inStock: false, name: "Phone", price: 599 },
  { category: "furniture", id: 3, inStock: true, name: "Desk", price: 299 },
  { category: "furniture", id: 4, inStock: true, name: "Chair", price: 199 },
  { category: "electronics", id: 5, inStock: true, name: "Tablet", price: 449 },
  { category: "electronics", id: 6, inStock: false, name: "Monitor", price: 349 },
];
const ordByPrice = pipe(
  N.Ord,
  Ord.contramap((p: Product) => p.price),
);

const getAvailableElectronicNames = (items: Product[]) =>
  pipe(
    items,
    RA.filter((p) => p.category === "electronics" && p.inStock),
    RA.sort(ordByPrice),
    RA.map((p) => p.name),
  );

const calculate = concatAll(N.MonoidSum);

const getTotalStockValue = (items: Product[]) =>
  pipe(
    items,
    RA.filter((p) => p.inStock),
    RA.map((p) => p.price),
    calculate,
  );

const groupByCategory = (items: Product[]) =>
  pipe(
    items, // возьми продукты
    RNA.fromArray, // сделай ReadonlyArray
    O.map(RNA.groupBy((i) => i.category)), // сгруппируй по категории,
    O.getOrElse(() => ({})), // или верни пустой объект,
  );

console.log(getAvailableElectronicNames(products));
console.log(getTotalStockValue(products));
console.log(groupByCategory(products));
