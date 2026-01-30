export const pxString = "px";
export const zeroString = "0";
export const whitespace = " ";
export const dash = "-";
export const semicolon = ";";
export const emptyString = "";
export const colon = ":";
export const comma = ",";

export const splitByDash = (s: string): string[] => s.split(dash);
export const splitBySemicolon = (s: string): string[] => s.split(semicolon);
export const splitBySpace = (s: string): string[] => s.split(whitespace);
export const trimString = (s: string): string => s.trim();

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

export const makePxString = (s: string): string => `${s}px`;

export const isString = (v: unknown): v is string => typeof v === "string";
export const isNumber = (v: unknown): v is number => typeof v === "number";
export const isFunction = (v: unknown): v is (...args: unknown[]) => unknown =>
  typeof v === "function";

export const isNumericString = (s: string): boolean => !Number.isNaN(Number(s));

export const isCssVariable = (s: string): boolean => s.startsWith(`${dash}${dash}`);
