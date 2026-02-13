/*
Shunting Yard Algorithm
https://www.youtube.com/watch?v=XozvvM-7XHg
 */

import { Parentheses } from "./constants.ts";
import {
  arithmeticStrategy,
  getArrLastItem,
  isCloseParenthesis,
  isEqualOrLowerPriorityOperator,
  isHigherPriorityOperator,
  isMathOperator,
  isNumber,
  isNumericString,
  isOpenParenthesis,
  removeWhitespace,
} from "./helpers.ts";
import { ExpressionToken } from "./types.ts";

export const parseToRpn = (expression: string): string => {
  const normalizedExpression = removeWhitespace(expression);
  let rpn = "";
  const operators: ExpressionToken[] = [];

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
      const idx = operators.indexOf(Parentheses.open);
      if (idx) {
        const s = operators.splice(idx, operators.length).join("").slice(1);
        rpn += s;
      }
      continue;
    }

    if (isMathOperator(current)) {
      if (!operators.length) {
        operators.push(current);
        continue;
      }

      const lastItem = getArrLastItem(operators);
      const isLastItemMathOperator = isMathOperator(lastItem);

      if (!isLastItemMathOperator) {
        operators.push(current);
        continue;
      }

      let equalOrLower = isEqualOrLowerPriorityOperator(current, lastItem);

      if (equalOrLower) {
        while (equalOrLower) {
          rpn += operators.pop() ?? "";

          const last = getArrLastItem(operators);

          equalOrLower = isMathOperator(last)
            ? isEqualOrLowerPriorityOperator(current, last)
            : false;
        }
        operators.push(current);
        continue;
      }

      const higher = isMathOperator(lastItem) ? isHigherPriorityOperator(current, lastItem) : false;

      if (higher) {
        operators.push(current);
      }
    }
  }

  return operators.length ? rpn.concat(operators.reverse().join("")) : rpn;
};
// console.log(parseToRpn("8 - (4 + 6) / 2 - 1"));
console.log(parseToRpn("3 + 2 * 4"));

export const evaluator = (expression: string): number => {
  const stack: number[] = [];
  const rpn = parseToRpn(expression);
  console.log(rpn);

  for (let i = 0; i < rpn.length; i++) {
    const current = rpn[i];

    if (isNumericString(current)) {
      stack.push(Number(current));
    }

    if (isMathOperator(current)) {
      const second = stack.pop();
      const first = stack.pop();

      if (isNumber(second) && isNumber(first)) {
        stack.push(arithmeticStrategy(current).execute(second, first));
      }
    }
  }

  return stack[0];
};
// console.log(evaluator("8 - (4 + 6) / 2 - 1"));
console.log(evaluator("3 + 2 * 4 - 1"));
