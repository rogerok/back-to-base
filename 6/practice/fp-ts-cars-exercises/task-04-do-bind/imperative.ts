// Task 4: IO.Do + IO.bind — do-нотация
//
// В задании от ментора generateRound использовал IO.Do + IO.bind
// чтобы сгенерировать двух машин и вычислить ответ, с доступом к предыдущим результатам.
// Здесь — аналогичная задача: генерация вопроса для математической викторины.
//
// Перепиши используя:
// - IO.Do + IO.bind для накопления контекста
// - IO.map для финального преобразования
// - pipe

type Operator = "+" | "-" | "*";

interface MathQuestion {
  text: string; // "12 + 5 = ?"
  answer: number; // 17
  operand1: number;
  operand2: number;
  operator: Operator;
}

const OPERATORS: Operator[] = ["+", "-", "*"];

function calculate(a: number, b: number, op: Operator): number {
  switch (op) {
    case "+":
      return a + b;
    case "-":
      return a - b;
    case "*":
      return a * b;
  }
}

function generateQuestion(): MathQuestion {
  const operand1 = Math.floor(Math.random() * 50) + 1; // 1-50
  const operand2 = Math.floor(Math.random() * 50) + 1;
  const operator = OPERATORS[Math.floor(Math.random() * OPERATORS.length)];
  const answer = calculate(operand1, operand2, operator);
  const text = `${operand1} ${operator} ${operand2} = ?`;

  return { text, answer, operand1, operand2, operator };
}

export { generateQuestion, calculate, OPERATORS };
export type { MathQuestion, Operator };
