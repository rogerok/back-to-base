Sources:
[Theory: Expressions vs. Statements](https://hexlet.io/courses/intro_to_programming/lessons/expressions/theory_unit)
[MDN](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements#difference_between_statements_and_declarations)
## Expression

**Expression** - is any valid unit of code that _resolves_ to a value.

Below `5` is expression, it resolves to value `5`

```ts
const x = 5;
```

Below `getAnswer()` - a function call - is another expression.This call will return a value, i.e. this function call will resolve to a value:

```ts
const y = getAnswer();
```

## Statements 
Statement is an instruction, an action. For example `if`, `while`, `for`
All those are statements, because they perform actions and control actions, but don't become values