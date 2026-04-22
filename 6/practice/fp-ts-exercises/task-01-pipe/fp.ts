import { flow } from "fp-ts/lib/function";
const multiply = (a: number) => a * 1.2;
const round = (a: number) => Math.round(a * 100) / 100;
const toStr = (a: number) => `$${a.toFixed(2)}`;

const processPrice = flow(multiply, round, toStr);

console.log(processPrice(100));
