import { match, P } from "ts-pattern";

import { INTERPOLATION_MARKER, pxString, theme, whitespace, zeroString } from "./constants.ts";
import {
  isCalcString,
  isCssVariable,
  isFunction,
  isNumber,
  isNumericString,
  isString,
  kebabCaseToCamelCase,
  makePxString,
  normalizeCommaTokens,
  processCalcString,
  removeNewLines,
  sliceAfterColon,
  sliceBeforeColon,
  splitBySemicolon,
  splitBySpace,
  trimString,
} from "./helpers.ts";

export const templateToArray = (strings: TemplateStringsArray): string[] => {
  return splitBySemicolon(strings.flatMap((s) => removeNewLines(s)).join())
    .map(trimString)
    .filter(Boolean);
};

const formatObjectKey = (s: string): string => {
  return match(s)
    .with(P.when(isCssVariable), (v) => sliceBeforeColon(v))
    .otherwise((v) => kebabCaseToCamelCase(sliceBeforeColon(v)));
};
const formatObjectValue = (s: string): string[] => {
  return normalizeCommaTokens(
    // Replace sequences of two or more whitespace characters
    // with a single space to normalize spacing before splitting
    splitBySpace(trimString(sliceAfterColon(s).replace(/\s{2,}/g, whitespace))),
  );
};

const parseDeclarations = (arr: string[]): Record<string, string[]>[] => {
  return arr.map((s) => ({ [formatObjectKey(s)]: formatObjectValue(s) }));
};

const processArgument = (arg: unknown): string => {
  return match(arg)
    .returnType<string>()
    .with(P.when(isNumber), String)
    .with(P.when(isFunction), (v) => String(v(theme)))
    .with(P.when(isString), (v) => v)
    .otherwise(String);
};

export const cssTagged = (
  strings: TemplateStringsArray,
  ...args: unknown[]
): Record<string, string> => {
  const declarations = templateToArray(strings);

  const parsedDeclarations = parseDeclarations(declarations);
  const interpolationQueue = [...args];

  const parseToken = (token: string): string => {
    return match(token)
      .returnType<string>()
      .with(zeroString, (v) => v)
      .with(
        P.when((v) => v.includes(INTERPOLATION_MARKER)),
        (v) => {
          return v.replace(INTERPOLATION_MARKER, processArgument(interpolationQueue.shift()));
        },
      )
      .with(pxString, () => makePxString(processArgument(interpolationQueue.shift())))
      .with(P.when(isNumericString), (v) => makePxString(v))
      .otherwise((v) => v);
  };

  const parseTokens = (tokens: string[]): string => {
    const isCalcTokens = isCalcString(tokens.join(""));
    if (isCalcTokens) {
      return processCalcString(tokens, parseToken);
    }

    return tokens.map(parseToken).join(whitespace);
  };

  return parsedDeclarations.reduce<Record<string, string>>((acc, item) => {
    for (const [key, value] of Object.entries(item)) {
      acc[key] = parseTokens(value);
    }

    return acc;
  }, {});
};
