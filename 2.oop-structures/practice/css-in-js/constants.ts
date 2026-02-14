export const pxString = "px";
export const zeroString = "0";
export const whitespace = " ";
export const dash = "-";
export const semicolon = ";";
export const emptyString = "";
export const colon = ":";
export const comma = ",";
export const INTERPOLATION_MARKER = "INTERPOLATION_MARKER";

export const ArithmeticOperatorTokens = {
  Add: "+",
  Divide: "/",
  Exponent: "**",
  Modulo: "%",
  Multiply: "*",
  Subtract: "-",
} as const;

export const OperatorPrecedenceMap = {
  [ArithmeticOperatorTokens.Add]: 1,
  [ArithmeticOperatorTokens.Divide]: 2,
  [ArithmeticOperatorTokens.Exponent]: 3,
  [ArithmeticOperatorTokens.Modulo]: 2,
  [ArithmeticOperatorTokens.Multiply]: 2,
  [ArithmeticOperatorTokens.Subtract]: 1,
} as const;

export const Parentheses = {
  close: ")",
  open: "(",
} as const;
export const theme = {
  border: {
    width: 2,
  },
  color: "blue",
  spacing: 4,
};
export type ThemeType = typeof theme;
export const space = 8;
export const color = "red";
