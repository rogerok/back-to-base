import { ObjectValues } from "../../../../helpers/types.ts";
import { ArithmeticOperatorTokens, Parentheses } from "../constants.ts";
import { ArithmeticOperator } from "../types.ts";

export const Operators = {
  [ArithmeticOperatorTokens.Add]: {
    prec: 2,
  },
  [ArithmeticOperatorTokens.Divide]: {
    prec: 3,
  },
  [ArithmeticOperatorTokens.Multiply]: {
    prec: 3,
  },
  [ArithmeticOperatorTokens.Subtract]: {
    prec: 2,
  },
} as const;

export const TokenTypes = {
  ADDITION: ArithmeticOperatorTokens.Add,
  DIVISION: ArithmeticOperatorTokens.Divide,
  IDENTIFIER: "IDENTIFIER",
  MULTIPLICATION: ArithmeticOperatorTokens.Multiply,
  NUMBER: "NUMBER",
  PARENTHESIS_LEFT: Parentheses.open,
  PARENTHESIS_RIGHT: Parentheses.close,
  SUBTRACTION: ArithmeticOperatorTokens.Subtract,
} as const;

export type TokenTypesValuesType = ObjectValues<typeof TokenTypes>;

export const TokenSpec = [
  [/^\s+/, null],
  [/^(?:\d+(?:\.\d*)?|\.\d+)/, TokenTypes.NUMBER],
  [/^[a-z]+/, TokenTypes.IDENTIFIER],
  [/^\+/, TokenTypes.ADDITION],
  [/^\-/, TokenTypes.SUBTRACTION],
  [/^\*/, TokenTypes.MULTIPLICATION],
  [/^\//, TokenTypes.DIVISION],
  [/^\(/, TokenTypes.PARENTHESIS_LEFT],
  [/^\)/, TokenTypes.PARENTHESIS_RIGHT],
] as const;

export type ExpressionTypes = "BinaryExpression" | "Number" | "UnaryExpression";

export interface NumberExpressionType extends BaseExpression {
  type: "Number";
  value: number;
}

export interface BinaryExpression extends BaseExpression {
  left: Expression | null;
  operator: ArithmeticOperator;
  right: Expression | null;
  type: "BinaryExpression";
}

export interface BinaryExpression extends BaseExpression {
  left: Expression | null;
  operator: ArithmeticOperator;
  right: Expression | null;
  type: "BinaryExpression";
}

export interface BaseExpression {
  type: ExpressionTypes;
}

export type Expression = BinaryExpression | NumberExpressionType;
