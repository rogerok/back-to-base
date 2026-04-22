// Task 4: IO.Do + IO.bind — do-нотация
//
// Перепиши generateQuestion используя fp-ts:
// - IO.Do для начального контекста {}
// - IO.bind("field", () => IO-эффект) для добавления полей
//   Внутри bind доступны все предыдущие поля через деструктуризацию
// - IO.map для финального преобразования
// - R.randomInt, R.randomElem для случайных значений

import { pipe } from "fp-ts/function";
import * as IO from "fp-ts/IO";
import * as R from "fp-ts/Random";

type Operator = "+" | "-" | "*";

interface MathQuestion {
  text: string;
  answer: number;
  operand1: number;
  operand2: number;
  operator: Operator;
}

const OPERATORS: Operator[] = ["+", "-", "*"];

const calculate = (a: number, b: number, op: Operator): number => {
  switch (op) {
    case "+":
      return a + b;
    case "-":
      return a - b;
    case "*":
      return a * b;
  }
};

// TODO: перепиши через IO.Do + IO.bind
// const generateQuestion: IO.IO<MathQuestion> = pipe(
//   IO.Do,
//   IO.bind("operand1", () => R.randomInt(1, 50)),
//   IO.bind("operand2", () => R.randomInt(1, 50)),
//   IO.bind("operator", () => R.randomElem(OPERATORS)),
//   IO.bind("answer", ({ operand1, operand2, operator }) =>
//     IO.of(calculate(operand1, operand2, operator))
//   ),
//   IO.map(({ operand1, operand2, operator, answer }) => ({
//     text: `${operand1} ${operator} ${operand2} = ?`,
//     answer,
//     operand1,
//     operand2,
//     operator,
//   })),
// )

const generateQuestion: IO.IO<MathQuestion> = () => {
  throw new Error("TODO");
};

export { generateQuestion, calculate, OPERATORS };
export type { MathQuestion, Operator };
