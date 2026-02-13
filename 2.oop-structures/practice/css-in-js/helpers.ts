import {
  ArithmeticOperatorTokens,
  colon,
  comma,
  dash,
  emptyString,
  OperatorPrecedenceMap,
  Parentheses,
  pxString,
  semicolon,
  whitespace,
} from "./constants.ts";
import {
  ArithmeticOperator,
  CloseParenthesis,
  OpenParenthesis,
  OperatorPrecedence,
} from "./types.ts";

export const splitByDash = (s: string): string[] => s.split(dash);
export const splitBySemicolon = (s: string): string[] => s.split(semicolon);
export const splitBySpace = (s: string): string[] => s.split(whitespace);
export const trimString = (s: string): string => s.trim();
export const removeWhitespace = (s: string): string => s.replaceAll(whitespace, "");

export const firstCharToUpperCase = (s: string): string => s.charAt(0).toUpperCase() + s.slice(1);

export const kebabCaseToCamelCase = (s: string): string => {
  return splitByDash(s)
    .map((s, idx) => (idx ? firstCharToUpperCase(s) : s))
    .join(emptyString);
};
export const removeNewLines = (s: string): string => s.replace(/\n/gi, emptyString);

export const sliceBeforeColon = (s: string): string => s.slice(0, s.indexOf(colon));
export const sliceAfterColon = (s: string): string => s.slice(s.lastIndexOf(colon) + 1);

export const normalizeCommaTokens = (s: string[]): string[] =>
  s.reduce<string[]>((acc, s) => {
    const firstChar = s.charAt(0);
    const isOneChar = s.length === 1;

    const isComma = firstChar === comma;

    if (isComma && isOneChar) {
      acc.push(emptyString);
    } else if (isComma && !isOneChar) {
      acc.push(s.slice(1));
    } else {
      acc.push(s);
    }
    return acc;
  }, []);

export const makePxString = (s: string): string => `${s}${pxString}`;

export const isString = (v: unknown): v is string => typeof v === "string";
export const isNumber = (v: unknown): v is number => typeof v === "number";
export const isFunction = (v: unknown): v is (...args: unknown[]) => unknown =>
  typeof v === "function";

export const isNumericString = (s: string): boolean => !Number.isNaN(Number(s));

export const isCssVariable = (s: string): boolean => s.startsWith(`${dash}${dash}`);

export const isCalcString = (s: string): boolean => s.startsWith("calc");

// ==== Eval Helpers ====

export const isOpenParenthesis = (s: string): s is OpenParenthesis => s === Parentheses.open;
export const isCloseParenthesis = (s: string): s is CloseParenthesis => s === Parentheses.close;
export const isMathOperator = (s: string): s is ArithmeticOperator => s in OperatorPrecedenceMap;

export const getArrLastItem = <T>(arr: T[]): T => arr[arr.length - 1];

export const getHigherPriorityOperator = (
  incomingOperator: ArithmeticOperator,
  stackOperator: ArithmeticOperator,
): OperatorPrecedence =>
  OperatorPrecedenceMap[incomingOperator] > OperatorPrecedenceMap[stackOperator]
    ? OperatorPrecedenceMap[incomingOperator]
    : OperatorPrecedenceMap[stackOperator];

export const isHigherPriorityOperator = (
  toCompareOperator: ArithmeticOperator,
  existingOperator: ArithmeticOperator,
): boolean => OperatorPrecedenceMap[toCompareOperator] > OperatorPrecedenceMap[existingOperator];

export const isLowerPriorityOperator = (
  incomingOperator: ArithmeticOperator,
  stackOperator: ArithmeticOperator,
): boolean => OperatorPrecedenceMap[incomingOperator] < OperatorPrecedenceMap[stackOperator];

export const isEqualPriorityOperator = (
  incomingOperator: ArithmeticOperator,
  stackOperator: ArithmeticOperator,
): boolean => OperatorPrecedenceMap[incomingOperator] === OperatorPrecedenceMap[stackOperator];

export const isEqualOrLowerPriorityOperator = (
  toCompareOperator: ArithmeticOperator,
  existingOperator: ArithmeticOperator,
): boolean =>
  isLowerPriorityOperator(toCompareOperator, existingOperator) ||
  isEqualPriorityOperator(toCompareOperator, existingOperator);

interface ArithmeticHandler {
  execute: (first: number, second: number) => number;
}

class AddHandler implements ArithmeticHandler {
  execute = (first: number, second: number): number => first + second;
}
class DivideHandler implements ArithmeticHandler {
  execute = (first: number, second: number): number => first / second;
}
class ExponentHandler implements ArithmeticHandler {
  execute = (first: number, second: number): number => first ** second;
}
class ModuloHandler implements ArithmeticHandler {
  execute = (first: number, second: number): number => first % second;
}
class MultiplyHandler implements ArithmeticHandler {
  execute = (first: number, second: number): number => first * second;
}
class SubtractHandler implements ArithmeticHandler {
  execute = (first: number, second: number): number => first - second;
}

export const arithmeticStrategy = (operator: ArithmeticOperator) => {
  const handlers = {
    [ArithmeticOperatorTokens.Add]: AddHandler,
    [ArithmeticOperatorTokens.Divide]: DivideHandler,
    [ArithmeticOperatorTokens.Exponent]: ExponentHandler,
    [ArithmeticOperatorTokens.Modulo]: ModuloHandler,
    [ArithmeticOperatorTokens.Multiply]: MultiplyHandler,
    [ArithmeticOperatorTokens.Subtract]: SubtractHandler,
  };

  return new handlers[operator]();
};
