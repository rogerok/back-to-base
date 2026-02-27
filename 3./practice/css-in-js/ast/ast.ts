import {
  assertToken,
  getArithmeticHandler,
  isCloseParenthesis,
  isEqualPriorityOperator,
  isHigherPriorityOperator,
  isNumericString,
  isOpenParenthesis,
  isOperator,
} from "../helpers.ts";
import { BinaryExpression, Expression, NumberExpressionType } from "./constants.ts";
import { Tokenizer } from "./tokenizer.ts";

export const generateAST = (input: string) => {
  const stack: string[] = [];
  const output: Expression[] = [];

  const addOutput = (token: Expression) => {
    output.push(token);
  };

  const peek = () => {
    return stack.at(-1);
  };

  const handlePop = (): Expression | undefined => {
    const op = stack.pop();

    if (op === "(") {
      return;
    }

    const right = output.pop();
    const left = output.pop();

    if (op && isOperator(op)) {
      return {
        left: left ?? null,
        operator: op,
        right: right ?? null,
        type: "BinaryExpression",
      };
    }
  };

  const handleToken = (token: string) => {
    if (isNumericString(token)) {
      addOutput({
        type: "Number",
        value: Number.parseFloat(token),
      });
    }

    if (isOperator(token)) {
      const o1 = token;
      let o2 = peek();

      while (
        o2 !== undefined &&
        o2 !== "(" &&
        isOperator(o2) &&
        (isHigherPriorityOperator(o2, o1) || isEqualPriorityOperator(o2, o1))
      ) {
        const parsed = handlePop();
        if (parsed) {
          addOutput(parsed);
          o2 = peek();
        }
      }

      stack.push(o1);
    }

    if (isOpenParenthesis(token)) {
      stack.push(token);
    }

    if (isCloseParenthesis(token)) {
      let topOfStack = peek();

      while (topOfStack !== "(") {
        assertToken(stack.length !== 0);

        const parsed = handlePop();

        if (parsed) {
          addOutput(parsed);
        }

        topOfStack = peek();
      }

      assertToken(isOpenParenthesis(peek() ?? ""));
      handlePop();
    }
  };

  const tokenizer = new Tokenizer(input);

  let token;

  while ((token = tokenizer.getNextToken())) {
    handleToken(token.value);
  }

  while (stack.length) {
    assertToken(peek() !== "(");
    const parsed = handlePop();
    if (parsed) {
      addOutput(parsed);
    }
  }

  return output[0];
};

class Visitor {
  visit(expression: Expression) {
    switch (expression.type) {
      case "Number":
        return this.visitNumber(expression);
      case "BinaryExpression":
        return this.visitBinaryExpression(expression);
    }
  }

  visitNumber = (expression: NumberExpressionType): number => {
    return expression.value;
  };

  visitBinaryExpression = (expression: BinaryExpression): number => {
    const handler = getArithmeticHandler(expression.operator);

    if ("left" in expression && "right" in expression && expression.left && expression.right) {
      const left = this.visit(expression.left);
      const right = this.visit(expression.right);

      if (left && right) {
        return handler.execute(left, right);
      }
    }

    throw new Error(`Invalid operation: ${expression.operator}`);
  };
}

const input = "(2 + 3) * 4";

export const evaluator = (input: string): number => {
  const ast = generateAST(input);
  return new Visitor().visit(ast);
};

console.log(evaluator(input));
