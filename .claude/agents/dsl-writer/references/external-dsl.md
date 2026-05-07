# External DSL in TypeScript

An **external DSL** has its own syntax and lives in its own files (`.myconfig`, `.rules`, etc.).
You write a **parser** that turns text into a data structure (AST) your program can execute.

## Pipeline

```
Source text  →  Lexer  →  Token stream  →  Parser  →  AST  →  Interpreter / Compiler
```

---

## Minimal Hand-Written Example

We'll build a tiny expression language:

```
# Source text example
LET x = 10
LET y = 20
PRINT x + y
```

### Step 1 — Lexer (text → tokens)

```ts
type TokenKind =
  | "LET"
  | "PRINT"
  | "IDENT"
  | "NUMBER"
  | "PLUS"
  | "MINUS"
  | "STAR"
  | "SLASH"
  | "EQ"
  | "NEWLINE"
  | "EOF";

interface Token {
  kind: TokenKind;
  value: string;
  line: number;
}

function lex(source: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  let line = 1;

  while (i < source.length) {
    const ch = source[i];

    if (ch === "\n") {
      tokens.push({ kind: "NEWLINE", value: "\n", line });
      line++;
      i++;
      continue;
    }
    if (/\s/.test(ch)) {
      i++;
      continue;
    }
    if (ch === "#") {
      while (i < source.length && source[i] !== "\n") i++;
      continue;
    }
    if (ch === "+") {
      tokens.push({ kind: "PLUS", value: "+", line });
      i++;
      continue;
    }
    if (ch === "-") {
      tokens.push({ kind: "MINUS", value: "-", line });
      i++;
      continue;
    }
    if (ch === "*") {
      tokens.push({ kind: "STAR", value: "*", line });
      i++;
      continue;
    }
    if (ch === "/") {
      tokens.push({ kind: "SLASH", value: "/", line });
      i++;
      continue;
    }
    if (ch === "=") {
      tokens.push({ kind: "EQ", value: "=", line });
      i++;
      continue;
    }

    if (/[0-9]/.test(ch)) {
      let num = "";
      while (i < source.length && /[0-9.]/.test(source[i])) num += source[i++];
      tokens.push({ kind: "NUMBER", value: num, line });
      continue;
    }

    if (/[a-zA-Z_]/.test(ch)) {
      let word = "";
      while (i < source.length && /[a-zA-Z0-9_]/.test(source[i]))
        word += source[i++];
      const kind =
        word === "LET" || word === "PRINT" ? (word as TokenKind) : "IDENT";
      tokens.push({ kind, value: word, line });
      continue;
    }

    throw new Error(`Unexpected character '${ch}' at line ${line}`);
  }

  tokens.push({ kind: "EOF", value: "", line });
  return tokens;
}
```

### Step 2 — AST types

```ts
type Expr =
  | { kind: "number"; value: number }
  | { kind: "ident"; name: string }
  | { kind: "binary"; op: "+" | "-" | "*" | "/"; left: Expr; right: Expr };

type Stmt =
  | { kind: "let"; name: string; value: Expr }
  | { kind: "print"; value: Expr };
```

### Step 3 — Parser (tokens → AST)

Recursive descent — the most approachable parser style for small grammars.

```ts
class Parser {
  private pos = 0;
  constructor(private tokens: Token[]) {}

  private peek(): Token {
    return this.tokens[this.pos];
  }
  private advance(): Token {
    return this.tokens[this.pos++];
  }

  private expect(kind: TokenKind): Token {
    const t = this.advance();
    if (t.kind !== kind)
      throw new Error(`Expected ${kind}, got ${t.kind} at line ${t.line}`);
    return t;
  }

  parse(): Stmt[] {
    const stmts: Stmt[] = [];
    while (this.peek().kind !== "EOF") {
      if (this.peek().kind === "NEWLINE") {
        this.advance();
        continue;
      }
      stmts.push(this.parseStmt());
    }
    return stmts;
  }

  private parseStmt(): Stmt {
    const t = this.peek();
    if (t.kind === "LET") {
      this.advance();
      const name = this.expect("IDENT").value;
      this.expect("EQ");
      const value = this.parseExpr();
      return { kind: "let", name, value };
    }
    if (t.kind === "PRINT") {
      this.advance();
      return { kind: "print", value: this.parseExpr() };
    }
    throw new Error(`Unexpected token ${t.kind} at line ${t.line}`);
  }

  // Handles +/- (lowest precedence)
  private parseExpr(): Expr {
    let left = this.parseTerm();
    while (this.peek().kind === "PLUS" || this.peek().kind === "MINUS") {
      const op = this.advance().value as "+" | "-";
      left = { kind: "binary", op, left, right: this.parseTerm() };
    }
    return left;
  }

  // Handles */÷ (higher precedence)
  private parseTerm(): Expr {
    let left = this.parsePrimary();
    while (this.peek().kind === "STAR" || this.peek().kind === "SLASH") {
      const op = this.advance().value as "*" | "/";
      left = { kind: "binary", op, left, right: this.parsePrimary() };
    }
    return left;
  }

  private parsePrimary(): Expr {
    const t = this.peek();
    if (t.kind === "NUMBER") {
      this.advance();
      return { kind: "number", value: Number(t.value) };
    }
    if (t.kind === "IDENT") {
      this.advance();
      return { kind: "ident", name: t.value };
    }
    throw new Error(`Unexpected primary token ${t.kind} at line ${t.line}`);
  }
}
```

### Step 4 — Interpreter (walk the AST)

```ts
function interpret(stmts: Stmt[]): void {
  const env: Record<string, number> = {};

  function evalExpr(expr: Expr): number {
    if (expr.kind === "number") return expr.value;
    if (expr.kind === "ident") {
      if (!(expr.name in env))
        throw new Error(`Undefined variable: ${expr.name}`);
      return env[expr.name];
    }
    const l = evalExpr(expr.left);
    const r = evalExpr(expr.right);
    if (expr.op === "+") return l + r;
    if (expr.op === "-") return l - r;
    if (expr.op === "*") return l * r;
    if (expr.op === "/") return l / r;
    throw new Error("unreachable");
  }

  for (const stmt of stmts) {
    if (stmt.kind === "let") {
      env[stmt.name] = evalExpr(stmt.value);
      continue;
    }
    if (stmt.kind === "print") {
      console.log(evalExpr(stmt.value));
      continue;
    }
  }
}

// Putting it all together
const source = `
LET x = 10
LET y = 20
PRINT x + y * 2   # → 50
`;

const tokens = lex(source);
const ast = new Parser(tokens).parse();
interpret(ast);
// console output: 50
```

---

## Library Recommendations

| Library                      | Style                           | Best for                                   |
| ---------------------------- | ------------------------------- | ------------------------------------------ |
| **chevrotain**               | Parser combinators (code-first) | Best TS support, good error messages       |
| **nearley**                  | Grammar file (EBNF-like)        | Quick grammars, ambiguity handling         |
| **peggy** (PEG.js successor) | PEG grammar → JS parser         | Dead simple grammars                       |
| **antlr4ts**                 | ANTLR grammar → TS parser       | Complex languages, existing ANTLR grammars |

For most internal tools: hand-write the lexer + recursive descent parser.
It's ~200 lines and you keep full control.

also use this references

Читать
https://ru.hexlet.io/blog/posts/infinite-ladder-of-abstraction
https://ru.hexlet.io/courses/python-compound-data/lessons/barriers-of-abstraction/theory_unit
https://github.com/allousas/functional-core-imperative-shell
https://martinfowler.com/bliki/DomainSpecificLanguage.html

Подумать о:
у DSL есть порог уровня синтаксической абстракции - это может быть:

1. Совсем другой язык, который не похож на язык хоста.
   1.1. Язык, который строится поверх хостового языка, но имеет свой собственный синтаксис и правила. Например, JSX для React, который позволяет писать HTML-подобный синтаксис внутри JavaScript.
   1.2. Языки с макросами, которые позволяют создавать новые синтаксические конструкции и абстракции поверх существующего языка. Например, Lisp(Racket) с его мощными макросами, которые позволяют создавать новые языковые конструкции и даже изменять синтаксис языка.
2. Язык на основе YAML, JSON или другого формата данных, который может быть легко сериализован и десериализован.
3. Язык, который использует синтаксис хоста, но с библиотеками, ограниченными конструкциями и правилами, чтобы обеспечить простоту и безопасность.
   В js мире DSL может быть реализован с помощью функций, объектов (+Proxy), классов или даже шаблонных строк, которые предоставляют более удобный и ограниченный интерфейс для определенных задач. В TS можно добавить декораторы и reflect-metadata для создания более мощных DSL, которые могут включать в себя валидацию типов и метаданные.
