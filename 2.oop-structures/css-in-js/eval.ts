/*
Shunting Yard Algorithm
https://www.youtube.com/watch?v=XozvvM-7XHg
 */

import { isNumericString, removeWhitespace } from "./helpers.ts";

export const mathOperatorsPriority = {
  "-": 1,
  "*": 2,
  "**": 3,
  "/": 2,
  "%": 2,
  "+": 1,
} as const;

const parenthesis = {
  "(": 4,
  ")": 4,
} as const;

type Parenthesis = keyof typeof parenthesis;

type Token = Operators | Parenthesis;

type Operators = keyof typeof mathOperatorsPriority;
type MathOperatorPriority = (typeof mathOperatorsPriority)[Operators];

export const getArrLastItem = <T>(arr: T[]): T => arr[arr.length - 1];

export const isOpenParenthesis = (s: string): s is "(" => s === "(";
export const isCloseParenthesis = (s: string): s is ")" => s === ")";

export const isMathOperator = (s: string): s is Operators => s in mathOperatorsPriority;

export const getHigherPriorityOperator = (
  incomingOperator: Operators,
  stackOperator: Operators,
): MathOperatorPriority =>
  mathOperatorsPriority[incomingOperator] > mathOperatorsPriority[stackOperator]
    ? mathOperatorsPriority[incomingOperator]
    : mathOperatorsPriority[stackOperator];

export const isLowerPriorityOperator = (
  incomingOperator: Operators,
  stackOperator: Operators,
): boolean => mathOperatorsPriority[incomingOperator] < mathOperatorsPriority[stackOperator];

export const isEqualPriorityOperator = (
  incomingOperator: Operators,
  stackOperator: Operators,
): boolean => mathOperatorsPriority[incomingOperator] === mathOperatorsPriority[stackOperator];

export const isHigherPriorityOperator = (
  toCompareOperator: Operators,
  existingOperator: Operators,
): boolean => mathOperatorsPriority[toCompareOperator] > mathOperatorsPriority[existingOperator];

export const isEqualOrLowerPriorityOperator = (
  toCompareOperator: Operators,
  existingOperator: Operators,
): boolean =>
  isLowerPriorityOperator(toCompareOperator, existingOperator) ||
  isEqualPriorityOperator(toCompareOperator, existingOperator);

export const parseToRpn = (expression: string): string => {
  const normalizedExpression = removeWhitespace(expression);
  let rpn = "";
  const operators: Token[] = [];

  for (let i = 0; i < normalizedExpression.length; i++) {
    const current = normalizedExpression[i];

    if (isNumericString(current)) {
      rpn += current;
      continue;
    }

    if (isOpenParenthesis(current)) {
      operators.push(current);

      continue;
    }

    if (isCloseParenthesis(current)) {
      const idx = operators.indexOf("(");
      if (idx) {
        operators.splice(idx, operators.length);
      }
      continue;
    }

    if (isMathOperator(current)) {
      if (!operators.length) {
        operators.push(current);
        continue;
      }

      const lastItem = getArrLastItem(operators);

      let equalOrLower = isMathOperator(lastItem)
        ? isEqualOrLowerPriorityOperator(current, lastItem)
        : false;

      if (equalOrLower) {
        while (equalOrLower) {
          console.log("ebash");
          rpn += operators.pop() ?? "";
          const last = getArrLastItem(operators);
          equalOrLower = isMathOperator(last)
            ? isEqualOrLowerPriorityOperator(current, last)
            : false;
        }
        operators.push(current);
        continue;
      }

      const higherOrLower = isMathOperator(lastItem)
        ? isEqualOrLowerPriorityOperator(current, lastItem)
        : false;

      if (higherOrLower) {
        operators.push(current);
      }
    }
  }

  return operators.length ? rpn.concat(operators.join("")) : rpn;
};
// console.log(parseToRpn("8 - (4 + 6) / 2 - 1"));
// console.log(parseToRpn("(4 + 6)"));
console.log(parseToRpn("3 + 2 * 4 - 1"));

export const evaluator = (str: string): number => {
  return 0;
};
