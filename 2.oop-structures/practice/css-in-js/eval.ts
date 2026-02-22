/*
Shunting Yard Algorithm
https://www.youtube.com/watch?v=XozvvM-7XHg
 */

// TODO: implement exponent handling

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

// TODO: to AST

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

      if (idx >= 0) {
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

export const evaluator = (expression: string): number => {
  const stack: number[] = [];
  const rpn = parseToRpn(expression);

  for (let i = 0; i < rpn.length; i++) {
    const current = rpn[i];

    if (isNumericString(current)) {
      stack.push(Number(current));
      continue;
    }

    if (isMathOperator(current)) {
      const second = stack.pop();
      const first = stack.pop();

      if (isNumber(second) && isNumber(first)) {
        stack.push(arithmeticStrategy(current).execute(first, second));
      }
    }
  }

  return stack[0];
};
