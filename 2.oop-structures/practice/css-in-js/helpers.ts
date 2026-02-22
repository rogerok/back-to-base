import {
  ArithmeticOperatorTokens,
  colon,
  comma,
  dash,
  emptyString,
  INTERPOLATION_MARKER,
  OperatorPrecedenceMap,
  Parentheses,
  pxString,
  semicolon,
  whitespace,
} from "./constants.ts";
import { ArithmeticOperator, CloseParenthesis, OpenParenthesis } from "./types.ts";

export const splitByDash = (s: string): string[] => s.split(dash);
export const splitBySemicolon = (s: string): string[] => s.split(semicolon);
export const splitBySpace = (s: string): string[] => s.split(whitespace);
export const trimString = (s: string): string => s.trim();
export const removeWhitespace = (s: string): string => s.replaceAll(whitespace, emptyString);
export const removeNewLines = (s: string): string => s.replace(/\n/gi, emptyString);
export const firstCharToUpperCase = (s: string): string => s.charAt(0).toUpperCase() + s.slice(1);
export const sliceBeforeColon = (s: string): string => s.slice(0, s.indexOf(colon));
export const sliceAfterColon = (s: string): string => s.slice(s.lastIndexOf(colon) + 1);
export const makePxString = (s: string): string => `${s}${pxString}`;
export const keepLetters = (value: string): string => value.replace(/[^a-z%]/gi, "");
export const removeLetters = (value: string): string => value.replace(/[a-z%]/gi, "");

export const kebabCaseToCamelCase = (s: string): string => {
  return splitByDash(s)
    .map((s, idx) => (idx ? firstCharToUpperCase(s) : s))
    .join(emptyString);
};

export const normalizeCommaTokens = (tokens: string[]): string[] => {
  const normalizeTokens = (inputTokens: string[]): string[] => {
    return inputTokens.reduce<string[]>((result, token) => {
      const firstChar = token.charAt(0);
      const isSingleChar = token.length === 1;
      const isLeadingComma = firstChar === comma;

      if (isLeadingComma && isSingleChar) {
        result.push(INTERPOLATION_MARKER);
      } else if (isLeadingComma && !isSingleChar) {
        result.push(INTERPOLATION_MARKER + token.slice(1));
      } else {
        result.push(token);
      }

      return result;
    }, []);
  };

  if (isCalcString(tokens.join())) {
    const marker = "marker";
    const joinedWithMarker = tokens.join(marker);

    const innerCalcContent = joinedWithMarker.slice(
      joinedWithMarker.indexOf(Parentheses.open) + 1,
      joinedWithMarker.lastIndexOf(Parentheses.close),
    );

    const calcTokens = innerCalcContent.split(marker);

    const normalized = normalizeTokens(calcTokens);

    normalized[0] = `calc(${normalized[0]}`;
    normalized[normalized.length - 1] += ")";

    return normalized;
  }

  return normalizeTokens(tokens);
};

export const isString = (v: unknown): v is string => typeof v === "string";
export const isNumber = (v: unknown): v is number => typeof v === "number";
export const isFunction = (v: unknown): v is (...args: unknown[]) => unknown =>
  typeof v === "function";
export const isNumericString = (s: string): boolean => !Number.isNaN(Number(s));
export const isCssVariable = (s: string): boolean => s.startsWith(`${dash}${dash}`);
export const isCalcString = (s: string): boolean => s.includes("calc");
export const isOpenParenthesis = (s: string): s is OpenParenthesis => s === Parentheses.open;
export const isCloseParenthesis = (s: string): s is CloseParenthesis => s === Parentheses.close;
export const isMathOperator = (s: string): s is ArithmeticOperator => s in OperatorPrecedenceMap;

export const processCalcString = (
  calcTokens: string[],
  parseToken: (token: string) => string,
): string => {
  const calcExpression = calcTokens.join(whitespace);

  const innerExpression = calcExpression
    .slice(
      calcExpression.indexOf(Parentheses.open) + 1,
      calcExpression.lastIndexOf(Parentheses.close),
    )
    .split(" ");

  const parsedTokens = innerExpression.map(parseToken);

  const extractedUnits = parsedTokens
    .map(keepLetters)
    .filter(Boolean)
    .filter((u) => u !== INTERPOLATION_MARKER);

  const numericExpression = parsedTokens.map(removeLetters).join(emptyString);

  if (extractedUnits.length) {
    const referenceUnit = extractedUnits.pop();
    const hasMixedUnits = extractedUnits.some((unit) => unit !== referenceUnit);

    if (hasMixedUnits) {
      throw new Error(calcTokens.join("") + " Units should not be mixed");
    }

    if (referenceUnit) {
      return String(eval(numericExpression)) + referenceUnit;
    }
  }

  return String(eval(numericExpression));
};

// ==== Eval Helpers ====

export const getArrLastItem = <T>(arr: T[]): T => arr[arr.length - 1];

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

// TODO: rewrite to ts-pattern
export const arithmeticStrategy = (operator: ArithmeticOperator): ArithmeticHandler => {
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
