import { ArithmeticOperatorTokens, OperatorPrecedenceMap, Parentheses } from "./constants.ts";

type ObjectValues<T> = T[keyof T];

export type CloseParenthesis = typeof Parentheses.close;
export type OpenParenthesis = typeof Parentheses.open;
export type ParenthesisToken = CloseParenthesis | OpenParenthesis;

export type ArithmeticOperator = ObjectValues<typeof ArithmeticOperatorTokens>;

export type OperatorPrecedence = (typeof OperatorPrecedenceMap)[ArithmeticOperator];

export type ExpressionToken = ArithmeticOperator | ParenthesisToken;
