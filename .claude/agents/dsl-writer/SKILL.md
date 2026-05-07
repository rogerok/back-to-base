---
name: dsl-writer
description: >
  Use this skill whenever the user wants to learn about, design, implement, or understand
  Domain-Specific Languages (DSLs). Trigger on: "DSL", "domain-specific language",
  "mini-language", "builder pattern", "fluent API", "query builder", "schema DSL",
  "pipeline DSL", "rule engine", "expression language", "configuration language",
  "internal DSL", "external DSL", or any request to design a structured API that
  reads like a language. Also trigger when the user asks to create a "readable API",
  "chainable builder", or "declarative interface" for a specific domain.
  Examples are provided in TypeScript and JavaScript.
---

# DSL Writer

A skill for explaining, designing, and implementing Domain-Specific Languages (DSLs)
with examples in TypeScript and JavaScript.

## What is a DSL?

A **Domain-Specific Language** is a small language tailored to a specific problem domain.
Unlike general-purpose languages (TypeScript, Python), a DSL sacrifices generality for
expressiveness in its target domain.

**Two main families:**

| Type | Lives inside | Parsed by | Example |
|---|---|---|---|
| **Internal DSL** | Host language (TS/JS) | Host compiler | Fluent builder, tagged templates |
| **External DSL** | Its own syntax/file | Custom parser | `.graphql`, `.prisma`, Dockerfile |

---

## When to reach for this skill

Read `references/patterns.md` for the full pattern catalogue.
Below is the quick decision map:

```
User wants to...
├── chain method calls expressively   → Builder / Fluent API
├── configure something declaratively → Config Object DSL / Schema DSL
├── transform data step by step       → Pipeline DSL
├── express rules / conditions        → Rule DSL / Predicate DSL
├── embed a tiny query language       → Query Builder DSL
├── parse a custom file format        → External DSL  (see references/external-dsl.md)
└── generate code / AST               → AST Builder / Template DSL
```

---

## Core Teaching Structure

When explaining a DSL concept, always follow this order:

1. **Problem** — what pain does this solve without a DSL?
2. **DSL sketch** — show the desired end-user syntax first (TypeScript usage)
3. **Implementation** — build the engine step by step
4. **Tradeoffs** — what you gain and what you give up

---

## Style Guidelines for Examples

- Primary language: **TypeScript** (with explicit types)
- Secondary: **JavaScript** (when types would obscure the point)
- Prefer `class`-based builders for stateful DSLs
- Prefer plain objects + functions for stateless DSLs
- Show the **call site** before the **implementation** — DSLs are designed outside-in
- Annotate key lines with `// ← reason` comments

---

## Quick Reference: Internal DSL Patterns in TypeScript

### 1. Fluent Builder

```ts
// USAGE (call site first — design outside-in)
const query = new QueryBuilder()
  .from("users")
  .where("age", ">", 18)
  .select("id", "name")
  .limit(10)
  .build();

// IMPLEMENTATION
class QueryBuilder {
  private _table = "";
  private _conditions: string[] = [];
  private _fields: string[] = ["*"];
  private _limit?: number;

  from(table: string): this {           // returns `this` → enables chaining
    this._table = table;
    return this;
  }

  where(field: string, op: string, value: unknown): this {
    this._conditions.push(`${field} ${op} ${value}`);
    return this;
  }

  select(...fields: string[]): this {
    this._fields = fields;
    return this;
  }

  limit(n: number): this {
    this._limit = n;
    return this;
  }

  build(): string {
    let sql = `SELECT ${this._fields.join(", ")} FROM ${this._table}`;
    if (this._conditions.length) sql += ` WHERE ${this._conditions.join(" AND ")}`;
    if (this._limit !== undefined) sql += ` LIMIT ${this._limit}`;
    return sql;
  }
}
```

**Key insight:** every mutating method returns `this` — that's the entire trick.

---

### 2. Pipeline DSL

```ts
// USAGE
const result = pipeline([1, 2, 3, 4, 5])
  .filter(x => x % 2 === 0)
  .map(x => x * 10)
  .reduce((acc, x) => acc + x, 0)
  .value();
// → 60

// IMPLEMENTATION
class Pipeline<T> {
  constructor(private data: T[]) {}

  filter(fn: (x: T) => boolean): Pipeline<T> {
    return new Pipeline(this.data.filter(fn));   // ← new instance = immutable steps
  }

  map<U>(fn: (x: T) => U): Pipeline<U> {
    return new Pipeline(this.data.map(fn));
  }

  reduce<U>(fn: (acc: U, x: T) => U, init: U): Pipeline<U> {
    return new Pipeline([this.data.reduce(fn, init)]);
  }

  value(): T {
    return this.data[0] as T;
  }
}

function pipeline<T>(data: T[]): Pipeline<T> {
  return new Pipeline(data);
}
```

---

### 3. Rule / Predicate DSL

```ts
// USAGE
const isEligible = rule<User>()
  .when(u => u.age >= 18)
  .when(u => u.country === "FI")
  .when(u => !u.banned)
  .check;

console.log(isEligible({ age: 20, country: "FI", banned: false })); // true

// IMPLEMENTATION
function rule<T>() {
  const predicates: Array<(v: T) => boolean> = [];

  const builder = {
    when(pred: (v: T) => boolean) {
      predicates.push(pred);
      return builder;                // ← same object, chaining continues
    },
    get check() {
      return (value: T) => predicates.every(p => p(value));
    },
  };

  return builder;
}
```

---

### 4. Schema / Config DSL (Zod-style)

```ts
// USAGE — reads like a type declaration
const UserSchema = schema({
  id:    field.number().required(),
  name:  field.string().minLength(2),
  email: field.string().matches(/@/),
  role:  field.enum(["admin", "user"]).default("user"),
});

// IMPLEMENTATION (simplified)
const field = {
  string: () => new StringField(),
  number: () => new NumberField(),
  enum: (values: string[]) => new EnumField(values),
};

class StringField {
  private _min = 0;
  private _pattern?: RegExp;
  private _required = false;

  required(): this { this._required = true; return this; }
  minLength(n: number): this { this._min = n; return this; }
  matches(re: RegExp): this { this._pattern = re; return this; }

  validate(v: unknown): boolean {
    if (typeof v !== "string") return !this._required;
    if (v.length < this._min) return false;
    if (this._pattern && !this._pattern.test(v)) return false;
    return true;
  }
}
// NumberField, EnumField follow the same pattern
```

---

### 5. Tagged Template Literal DSL

```ts
// USAGE — looks like a real language embedded in JS
const query = gql`
  query GetUser($id: ID!) {
    user(id: $id) {
      name
      email
    }
  }
`;

// IMPLEMENTATION (tagging function)
function gql(strings: TemplateStringsArray, ...values: unknown[]): string {
  // Interleave strings and interpolated values
  return strings.reduce((acc, str, i) => acc + str + (values[i] ?? ""), "");
  // Real gql parsers return an AST, not a string
}
```

**Use when:** you want syntax highlighting, multi-line, and the content should
feel structurally different from surrounding code.

---

## External DSL (brief intro)

For custom file formats (`.myconfig`, `.myrules`), see `references/external-dsl.md`.
The approach:

```
Source text  →  Lexer (tokens)  →  Parser (AST)  →  Interpreter/Compiler
```

Recommended libraries for TS/JS:
- **nearley** — grammar-based parser (like ANTLR, lighter)
- **chevrotain** — hand-written parser combinators, excellent TS support
- **peggy** — PEG grammar, generates a JS parser

---

## Checklist Before Presenting a DSL Design

- [ ] Does the call site read naturally in the domain language?
- [ ] Are method names domain words (not implementation words)?
- [ ] Does chaining feel necessary, or would a plain config object be cleaner?
- [ ] Is the terminal operation clearly named? (`.build()`, `.execute()`, `.check`, `.value()`)
- [ ] Are intermediate states immutable or clearly documented as mutable?
- [ ] Is the TypeScript type inference helpful (autocomplete works on each step)?

---

## Reference Files

| File | When to read |
|---|---|
| `references/patterns.md` | Full pattern catalogue with tradeoff tables |
| `references/external-dsl.md` | Lexers, parsers, ASTs in TS |
| `references/real-world-examples.md` | Knex, Zod, RxJS, Effect — annotated excerpts |
