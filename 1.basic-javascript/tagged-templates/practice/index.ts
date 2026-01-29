import { match, P } from "ts-pattern";

import {
  comaToEmptyString,
  kebabCaseToCamelCase,
  replaceSpaces,
  sliceAfterColon,
  sliceBeforeColon,
  splitBySemicolon,
  splitBySpace,
  trimString,
} from "./helpers.ts";

export const templateToArray = (strings: TemplateStringsArray): string[] => {
  return splitBySemicolon(strings.flatMap((s) => replaceSpaces(s)).join()).map(trimString);
};

const formatObjectKey = (s: string): string => kebabCaseToCamelCase(sliceBeforeColon(s));
const formatObjectValue = (s: string): string[] =>
  comaToEmptyString(splitBySpace(trimString(sliceAfterColon(s))));

// const processArr = (arr: string[]): Record<string, string[]>[] => {
//   return arr.map((s) => ({
//     [formatObjectKey(s)]: formatObjectValue(s),
//   }));
// };

const processArr = (arr: string[]) => {
  return arr.map((s) => [formatObjectKey(s), formatObjectValue(s)]);
};

const isString = (x: unknown): x is string => typeof x === "string";
const isNumber = (x: unknown): x is number => typeof x === "number";
const isFunction = (x: unknown): x is (...args: any[]) => unknown => typeof x === "function";

const processArgument = (arg: unknown): string => {
  return match(arg)
    .returnType<string>()
    .with(P.when(isNumber), (v) => String(v))
    .with(P.when(isFunction), (v) => String(v()))
    .with(P.when(isString), (v) => v)
    .otherwise(() => String(arg));
};

export const cssTagged = (strings: TemplateStringsArray, ...args: unknown[]) => {
  const arr = templateToArray(strings);
  const processed = processArr(arr);

  // console.log(processed);

  // const result = processed.reduce<Record<string, string>>((acc, item) => {}, {});
  //
  const proccessed2 = processed.reduce<Record<string, string>>((acc, item) => {
    const obj = item.map((v) => {
      if (Array.isArray(v)) {
        v.map((item) => {
          if (!item.length) {
            console.log(processArgument(args.pop()));
            return processArgument(args.pop());
          }

          return item;
        });
      }
      return v;
    });

    console.log(obj);
    return acc;
  }, {});

  return processed;
};

const space = 8;
const color = "red";

const theme = {
  border: {
    width: 2,
  },
  color: "blue",
  spacing: 4,
};

// cssTagged`
//   display: flex;
//   flex-direction: column;
//   justify-content: space-between;
//   align-items: center;
//
//   padding-top: 10;
//   padding-bottom: ${space}px;
//   padding-left: ${space * 2}px;
//   padding-right: ${space}px;
//
//   margin-top: 10px 20px;
//   margin-bottom: ${space}px ${space * 2}px ${space * 3}px;
//   margin-left-right-top-bottom: 1px 2px 3px 4px;
//
//   border-width: ${space}px ${space}px ${space}px ${space}px;
//   border-style: solid dashed dotted double;
//   border-top-left-right-bottom-width: ${space}px;
//   border-color: ${(theme) => theme.color};
//
//   background-color: ${color};
//   color: ${(theme) => theme.color};
//   outline-color: ${(theme) => theme.color};
//
//   width: 100%;
//   min-width: 10rem;
//   max-width: ${space * 10}px;
//
//   height: calc(100% - ${space}px);
//   min-height: ${(theme) => theme.spacing * 10}px;
//
//   box-shadow: 0 0 ${space}px rgba(0, 0, 0, 0.2);
//
//   transition-property: opacity transform background-color;
//   transition-duration: 200ms;
//   transition-timing-function: ease-in-out;
//
//   --custom-css-var: ${space}px;
// `;

cssTagged`
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  align-items: center;

  padding-top: 10;
  padding-bottom: ${space}px;
  padding-left: ${space}px;
  padding-right: ${space}px;

  margin-top: 10px 20px;
  margin-bottom: ${space}px ${space}px ${space}px;
  margin-left-right-top-bottom: 1px 2px 3px 4px;

  border-width: ${space}px ${space}px ${space}px ${space}px;
  border-style: solid dashed dotted double;
  border-top-left-right-bottom-width: ${space}px;

  background-color: ${color};

  width: 100%;
  min-width: 10rem;
  max-width: ${space}px;

  height: calc(100% - ${space}px);

  box-shadow: 0 0 ${space}px rgba(0, 0, 0, 0.2);

  transition-property: opacity transform background-color;
  transition-duration: 200ms;
  transition-timing-function: ease-in-out;

  --custom-css-var: ${space}px;
`;
