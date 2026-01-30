import { match, P } from "ts-pattern";

import {
  comaToEmptyString,
  isFunction,
  isNumber,
  isNumericString,
  isString,
  kebabCaseToCamelCase,
  makePxString,
  pxString,
  replaceSpaces,
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
  return splitBySemicolon(strings.flatMap((s) => replaceSpaces(s)).join())
    .map(trimString)
    .filter(Boolean);
};

const formatObjectKey = (s: string): string => {
  return kebabCaseToCamelCase(sliceBeforeColon(s));
};
const formatObjectValue = (s: string): string[] => {
  return comaToEmptyString(splitBySpace(trimString(sliceAfterColon(s))));
};

const processArr = (arr: string[]): Record<string, string[]>[] => {
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
  const processed = processArr(declarations);
  const interpolationQueue = [...args];

  const declarationMap = processed.reduce<Record<string, string[]>>((acc, item) => {
    for (const [key, value] of Object.entries(item)) {
      acc[key] = value;
    }

    return acc;
  }, {});

  const styleObject: Record<string, string> = {};

  for (const propertyName in declarationMap) {
    const rawValues = declarationMap[propertyName];

    styleObject[propertyName] = rawValues
      .map((token) => {
        return match(token)
          .returnType<string>()
          .with(zeroString, (v) => v)
          .with(pxString, () => makePxString(processArgument(interpolationQueue.shift())))
          .with(P.string.length(0), () => processArgument(interpolationQueue.shift()))
          .with(P.when(isNumericString), (v) => makePxString(v))
          .otherwise((v) => v);
      })
      .join(whitespace);
  }

  return styleObject;
};

const resp = cssTagged`
  height: calc(100% - ${space}px);
  min-height: ${(theme: ThemeType) => theme.spacing * 10}px;
  max-width: ${space * 10}px;
`;

console.log(resp);
