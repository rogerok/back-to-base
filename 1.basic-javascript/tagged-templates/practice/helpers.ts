export const splitByDash = (s: string): string[] => s.split("-");
export const splitBySemicolon = (s: string): string[] => s.split(";");
export const splitBySpace = (s: string): string[] => s.split(" ");
export const trimString = (s: string): string => s.trim();

export const firstCharToUpperCase = (s: string): string => s.charAt(0).toUpperCase() + s.slice(1);

export const kebabCaseToCamelCase = (s: string): string => {
  return splitByDash(s)
    .map((s, idx) => (idx ? firstCharToUpperCase(s) : s))
    .join("");
};
export const replaceSpaces = (s: string): string => s.replace(/\n/gi, "");
export const replaceDashWithSpace = (s: string): string => s.replaceAll("-", " ");

export const sliceBeforeColon = (s: string): string => s.slice(0, s.indexOf(":"));
export const sliceAfterColon = (s: string): string => s.slice(s.lastIndexOf(":") + 1);

export const comaToEmptyString = (s: string[]): string[] =>
  s.reduce<string[]>((acc, s) => {
    const firstChar = s.charAt(0);
    const isComa = firstChar === ",";
    const isOneChar = s.length === 1;

    if (isComa && isOneChar) {
      acc.push("");
    } else if (isComa && !isOneChar) {
      acc.push(s.slice(1));
    } else {
      acc.push(s);
    }
    return acc;
  }, []);

export const isString = (x: unknown): x is string => typeof x === "string";
export const isNumber = (x: unknown): x is number => typeof x === "number";

export const isFunction = (x: unknown): x is (...args: any[]) => unknown => typeof x === "function";
