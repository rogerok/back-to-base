import { ArithmeticOperatorTokens, Parentheses } from "./constants.ts";

type ObjectValues<T> = T[keyof T];

export type CloseParenthesis = typeof Parentheses.close;
export type OpenParenthesis = typeof Parentheses.open;
export type ParenthesisToken = CloseParenthesis | OpenParenthesis;

export type ArithmeticOperator = ObjectValues<typeof ArithmeticOperatorTokens>;
