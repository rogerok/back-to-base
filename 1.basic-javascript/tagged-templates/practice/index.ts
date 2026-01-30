import { match, P } from "ts-pattern";

import {
  isCssVariable,
  isFunction,
  isNumber,
  isNumericString,
  isString,
  kebabCaseToCamelCase,
  makePxString,
  normalizeCommaTokens,
  pxString,
  removeNewLines,
  sliceAfterColon,
  sliceBeforeColon,
  splitBySemicolon,
  splitBySpace,
  trimString,
  whitespace,
  zeroString,
} from "./helpers.ts";
import { space, theme, ThemeType } from "./theme.ts";

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

  console.log(declarations);

  const parsedDeclarations = parseDeclarations(declarations);
  console.log(parsedDeclarations);
  const interpolationQueue = [...args];

  const parseToken = (token: string): string => {
    return match(token)
      .returnType<string>()
      .with(zeroString, (v) => v)
      .with(pxString, () => makePxString(processArgument(interpolationQueue.shift())))
      .with(P.string.length(0), () => processArgument(interpolationQueue.shift()))
      .with(P.when(isNumericString), (v) => makePxString(v))
      .otherwise((v) => v);
  };

  return parsedDeclarations.reduce<Record<string, string>>((acc, item) => {
    for (const [key, value] of Object.entries(item)) {
      acc[key] = value.map(parseToken).join(whitespace);
    }

    return acc;
  }, {});
};

const resp = cssTagged`
  height: calc(100% - ${space}px);
  min-height: ${(theme: ThemeType) => theme.spacing * 5}px;
  max-width: ${space * 10}px;

`;

// const resp = cssTagged`
//   margin: ${space}px   ${space}px;
//
//   min-height: ${(theme: ThemeType) => theme.spacing}px;
//   min-width: 10rem;
//
//   padding: 0 ${space}px;
//
//   transition-duration: 200ms;
//   transition-property: opacity transform background-color;
//   transition-timing-function: ease-in-out;
//
//   width: 100%;
// `;

console.log(resp);
