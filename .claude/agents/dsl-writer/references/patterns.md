# DSL Patterns — Full Catalogue

## Pattern Index

1. [Fluent Builder](#1-fluent-builder)
2. [Immutable Pipeline](#2-immutable-pipeline)
3. [Rule / Predicate DSL](#3-rule--predicate-dsl)
4. [Schema / Validation DSL](#4-schema--validation-dsl)
5. [Event / Lifecycle DSL](#5-event--lifecycle-dsl)
6. [State Machine DSL](#6-state-machine-dsl)
7. [Routing DSL](#7-routing-dsl)
8. [Tagged Template DSL](#8-tagged-template-dsl)

---

## Pattern Tradeoff Table

| Pattern | Mutability | Complexity | Best for |
|---|---|---|---|
| Fluent Builder | Mutable (each call modifies state) | Low | SQL, HTTP requests, configs |
| Immutable Pipeline | Immutable (new instance per step) | Medium | Data transforms, RxJS-style |
| Rule DSL | Immutable (closures) | Low | Auth rules, validation policies |
| Schema DSL | Immutable | Medium | Input validation, codegen |
| State Machine | Explicit state | High | Workflows, UI states |
| Tagged Template | N/A | Low | SQL, HTML, GraphQL |

---

## 1. Fluent Builder

**Pattern:** Methods mutate internal state, return `this`.

**When to use:** Building a complex object that has many optional parts.

**Tradeoff:** Shared mutable state — calling `.build()` twice on same builder could surprise users. Use a `.clone()` method if branching is needed.

```ts
class HttpRequest {
  private _method = "GET";
  private _url = "";
  private _headers: Record<string, string> = {};
  private _body?: unknown;
  private _timeout = 5000;

  get(url: string): this { this._method = "GET"; this._url = url; return this; }
  post(url: string): this { this._method = "POST"; this._url = url; return this; }
  header(key: string, value: string): this { this._headers[key] = value; return this; }
  body(data: unknown): this { this._body = data; return this; }
  timeout(ms: number): this { this._timeout = ms; return this; }
  bearer(token: string): this { return this.header("Authorization", `Bearer ${token}`); }

  async send(): Promise<Response> {
    return fetch(this._url, {
      method: this._method,
      headers: this._headers,
      body: this._body ? JSON.stringify(this._body) : undefined,
      signal: AbortSignal.timeout(this._timeout),
    });
  }
}

// Usage
const res = await new HttpRequest()
  .post("https://api.example.com/users")
  .bearer(token)
  .header("Content-Type", "application/json")
  .body({ name: "Alice" })
  .timeout(3000)
  .send();
```

---

## 2. Immutable Pipeline

**Pattern:** Each step returns a new instance wrapping the transformed data.

**When to use:** Data transformation chains where you want to branch or reuse intermediate states.

**Tradeoff:** Allocates more objects; negligible for most use cases.

```ts
class Stream<T> {
  private constructor(private readonly source: () => T[]) {}

  static of<T>(...items: T[]): Stream<T> {
    return new Stream(() => items);
  }

  static from<T>(arr: T[]): Stream<T> {
    return new Stream(() => [...arr]);
  }

  filter(pred: (x: T) => boolean): Stream<T> {
    return new Stream(() => this.source().filter(pred));
  }

  map<U>(fn: (x: T) => U): Stream<U> {
    return new Stream(() => this.source().map(fn));
  }

  flatMap<U>(fn: (x: T) => U[]): Stream<U> {
    return new Stream(() => this.source().flatMap(fn));
  }

  take(n: number): Stream<T> {
    return new Stream(() => this.source().slice(0, n));
  }

  collect(): T[] {
    return this.source();   // ← lazy evaluation: nothing runs until here
  }

  first(): T | undefined {
    return this.collect()[0];
  }
}

// Usage — can branch from `base`
const base = Stream.from([1, 2, 3, 4, 5, 6]);
const evens = base.filter(x => x % 2 === 0).collect();   // [2, 4, 6]
const odds  = base.filter(x => x % 2 !== 0).collect();   // [1, 3, 5]
```

---

## 3. Rule / Predicate DSL

**Pattern:** Compose small predicates into a policy.

**When to use:** Authorization rules, feature flags, business eligibility checks.

**Tradeoff:** Harder to debug than a plain `if` chain — always add `.describe()` or `.explain()`.

```ts
type Predicate<T> = (value: T) => boolean;

class Rule<T> {
  private predicates: Array<{ label: string; fn: Predicate<T> }> = [];

  when(label: string, fn: Predicate<T>): this {
    this.predicates.push({ label, fn });
    return this;
  }

  // Evaluates all rules — returns first failure or null
  validate(value: T): string | null {
    for (const { label, fn } of this.predicates) {
      if (!fn(value)) return `Failed: ${label}`;
    }
    return null;
  }

  check(value: T): boolean {
    return this.validate(value) === null;
  }
}

// Usage
interface User { age: number; role: string; verified: boolean }

const canPublish = new Rule<User>()
  .when("must be adult", u => u.age >= 18)
  .when("must be editor or admin", u => ["editor", "admin"].includes(u.role))
  .when("must be verified", u => u.verified);

const alice: User = { age: 25, role: "editor", verified: true };
console.log(canPublish.check(alice));           // true
console.log(canPublish.validate({ ...alice, verified: false })); // "Failed: must be verified"
```

---

## 4. Schema / Validation DSL

**Pattern:** Chainable field descriptors that build a validator.

**When to use:** Runtime input validation (forms, API payloads, CLI args).

**Real-world example:** Zod, Joi, Yup.

```ts
interface ValidationResult { ok: boolean; errors: string[] }

abstract class Field<T> {
  protected _required = false;
  protected _label = "field";

  required(label = "field"): this {
    this._required = true;
    this._label = label;
    return this;
  }

  abstract validate(raw: unknown): ValidationResult;
}

class StringField extends Field<string> {
  private _min = 0;
  private _max = Infinity;
  private _pattern?: RegExp;

  min(n: number): this { this._min = n; return this; }
  max(n: number): this { this._max = n; return this; }
  matches(re: RegExp): this { this._pattern = re; return this; }
  email(): this { return this.matches(/^[^\s@]+@[^\s@]+\.[^\s@]+$/); }

  validate(raw: unknown): ValidationResult {
    const errors: string[] = [];
    if (raw === undefined || raw === null) {
      if (this._required) errors.push(`${this._label} is required`);
      return { ok: errors.length === 0, errors };
    }
    if (typeof raw !== "string") { errors.push(`${this._label} must be a string`); return { ok: false, errors }; }
    if (raw.length < this._min) errors.push(`${this._label} must be at least ${this._min} chars`);
    if (raw.length > this._max) errors.push(`${this._label} must be at most ${this._max} chars`);
    if (this._pattern && !this._pattern.test(raw)) errors.push(`${this._label} has invalid format`);
    return { ok: errors.length === 0, errors };
  }
}

// Convenience factory
const s = {
  string: () => new StringField(),
};

// Usage
const emailField = s.string().required("email").email().max(255);
console.log(emailField.validate("bad-email"));   // { ok: false, errors: ["email has invalid format"] }
console.log(emailField.validate("a@b.com"));     // { ok: true, errors: [] }
```

---

## 5. Event / Lifecycle DSL

**Pattern:** Named hook methods that register callbacks.

**When to use:** Plugin systems, middleware chains, test lifecycle (beforeEach/afterEach).

```ts
type Hook<T> = (ctx: T) => Promise<void> | void;

class Lifecycle<T> {
  private hooks: Record<string, Hook<T>[]> = {};

  private on(event: string, fn: Hook<T>): this {
    (this.hooks[event] ??= []).push(fn);
    return this;
  }

  beforeStart(fn: Hook<T>): this  { return this.on("beforeStart", fn); }
  onStart(fn: Hook<T>): this      { return this.on("start", fn); }
  onStop(fn: Hook<T>): this       { return this.on("stop", fn); }
  onError(fn: Hook<T>): this      { return this.on("error", fn); }

  async emit(event: string, ctx: T): Promise<void> {
    for (const fn of this.hooks[event] ?? []) await fn(ctx);
  }
}

// Usage
interface AppCtx { port: number }

const app = new Lifecycle<AppCtx>()
  .beforeStart(ctx => console.log(`Starting on port ${ctx.port}…`))
  .onStart(ctx => console.log(`Listening on :${ctx.port}`))
  .onStop(() => console.log("Shutting down"));

await app.emit("beforeStart", { port: 3000 });
await app.emit("start", { port: 3000 });
```

---

## 6. State Machine DSL

**Pattern:** Declare states and allowed transitions; the DSL enforces validity.

**When to use:** Order processing, UI states, document workflows.

**Tradeoff:** More ceremony upfront; pays off when transitions are complex.

```ts
type TransitionMap<S extends string, E extends string> = {
  [state in S]?: { [event in E]?: S };
};

class StateMachine<S extends string, E extends string> {
  private current: S;
  private transitions: TransitionMap<S, E>;

  constructor(initial: S, transitions: TransitionMap<S, E>) {
    this.current = initial;
    this.transitions = transitions;
  }

  dispatch(event: E): S {
    const next = this.transitions[this.current]?.[event];
    if (!next) throw new Error(`No transition: ${this.current} + ${event}`);
    this.current = next;
    return this.current;
  }

  get state(): S { return this.current; }
  is(s: S): boolean { return this.current === s; }
}

// Usage
type OrderState = "pending" | "paid" | "shipped" | "delivered" | "cancelled";
type OrderEvent = "pay" | "ship" | "deliver" | "cancel";

const order = new StateMachine<OrderState, OrderEvent>("pending", {
  pending:   { pay: "paid",       cancel: "cancelled" },
  paid:      { ship: "shipped",   cancel: "cancelled" },
  shipped:   { deliver: "delivered" },
  delivered: {},
  cancelled: {},
});

order.dispatch("pay");    // → "paid"
order.dispatch("ship");   // → "shipped"
// order.dispatch("cancel"); // throws — no transition from "shipped"
```

---

## 7. Routing DSL

**Pattern:** Method-per-HTTP-verb that registers handlers.

**When to use:** Micro-frameworks, test servers, API mocking.

```ts
type Handler = (req: { params: Record<string, string>; url: string }) => unknown;

class Router {
  private routes: Array<{ method: string; pattern: RegExp; keys: string[]; handler: Handler }> = [];

  private add(method: string, path: string, handler: Handler): this {
    const keys: string[] = [];
    const pattern = new RegExp(
      "^" + path.replace(/:([^/]+)/g, (_, k) => { keys.push(k); return "([^/]+)"; }) + "$"
    );
    this.routes.push({ method, pattern, keys, handler });
    return this;
  }

  get(path: string, handler: Handler): this    { return this.add("GET", path, handler); }
  post(path: string, handler: Handler): this   { return this.add("POST", path, handler); }
  delete(path: string, handler: Handler): this { return this.add("DELETE", path, handler); }

  handle(method: string, url: string): unknown {
    for (const route of this.routes) {
      if (route.method !== method) continue;
      const m = url.match(route.pattern);
      if (!m) continue;
      const params = Object.fromEntries(route.keys.map((k, i) => [k, m[i + 1]]));
      return route.handler({ params, url });
    }
    return { status: 404 };
  }
}

// Usage
const router = new Router()
  .get("/users",          () => [{ id: 1 }])
  .get("/users/:id",      ({ params }) => ({ id: params.id }))
  .post("/users",         () => ({ created: true }))
  .delete("/users/:id",   ({ params }) => ({ deleted: params.id }));

console.log(router.handle("GET", "/users/42"));   // { id: "42" }
```

---

## 8. Tagged Template DSL

**Pattern:** JS tagged template literals to embed a sub-language.

**When to use:** SQL, HTML, CSS, GraphQL, regex — anything where the content
should look visually distinct from surrounding code.

**Tradeoff:** No custom syntax highlighting unless you configure an editor plugin.

```ts
// Safe SQL with automatic escaping
function sql(strings: TemplateStringsArray, ...values: unknown[]): { query: string; params: unknown[] } {
  const params: unknown[] = [];
  const query = strings.reduce((acc, str, i) => {
    if (i < values.length) {
      params.push(values[i]);
      return acc + str + `$${params.length}`;   // PostgreSQL placeholder style
    }
    return acc + str;
  }, "");
  return { query, params };
}

// Usage — values are never interpolated directly → SQL injection impossible
const userId = "'; DROP TABLE users; --";
const { query, params } = sql`SELECT * FROM users WHERE id = ${userId} AND active = ${true}`;
// query  → "SELECT * FROM users WHERE id = $1 AND active = $2"
// params → ["'; DROP TABLE users; --", true]
```
