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
  return normalizeCommaTokens(splitBySpace(trimString(sliceAfterColon(s))));
};

const parseDeclarations = (arr: string[]): Record<string, string[]>[] => {
  return arr.map((s) => ({ [formatObjectKey(s)]: formatObjectValue(s) }));
};

const processArgument = (arg: unknown): string => {
  return match(arg)
    .returnType<string>()
    .with(P.when(isNumber), String)
    .with(P.when(isFunction), (v) => {
      console.log("isFunction", v);
      console.log("isFunction result", v(theme));
      return String(v(theme));
    })
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

// const resp = cssTagged`
//   --custom-var: 0 ${space}px ${(theme: ThemeType) => theme.spacing}px;
//
//   align-items: center;
//
//   border-color: ${(theme: ThemeType) => theme.color};
//   border-style: solid dashed dotted double;
//   border-width: ${space}px ${space}px ${space}px ${space}px;
//
//   box-shadow: 0 0 ${space}px rgba(0, 0, 0, 0.2);
//
//   display: flex;
//   flex-direction: column;
//
//   gap: ${space}px ${space}px;
//
//   height: 100px;
//   justify-content: space-between;
//
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

const resp = cssTagged`




  margin: ${space}px   ${space}px;

  min-height: ${(theme: ThemeType) => theme.spacing}px;
  min-width: 10rem;

  padding: 0 ${space}px;

  transition-duration: 200ms;
  transition-property: opacity transform background-color;
  transition-timing-function: ease-in-out;

  width: 100%;
`;

console.log(resp);
