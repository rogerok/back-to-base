import { filter, reduce } from "rambda";

import { curry, split } from "../helpers.ts";

// Exercise A
export const words = split(" ");

// Exercise B
const test = curry((re: RegExp, s: string): boolean => re.test(s));
const filterQs = filter(test(/q/i));

// Exercise C

const keepHighest = (x: number, y: number): number => (x >= y ? x : y);
// const max = (xs) => reduce((acc, x) => (x >= acc ? x : acc), -Infinity, xs);
const max = reduce(keepHighest, -Infinity);
