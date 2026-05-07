# Real-World DSL Examples — Annotated

## Knex.js — Query Builder DSL

Knex is the canonical JS Query Builder. Key design choices:

```ts
// The DSL reads almost like SQL
const users = await knex("users")           // .from() equivalent
  .select("id", "name", "email")
  .where("active", true)
  .where("age", ">=", 18)
  .orderBy("name", "asc")
  .limit(20)
  .offset(40);

// Knex insight: .where() is overloaded — accepts:
//   .where(column, value)           → "column = value"
//   .where(column, op, value)       → "column op value"
//   .where(obj)                     → multiple ANDs
//   .where(fn)                      → grouped conditions
knex("orders")
  .where(function() {
    this.where("status", "open")
        .orWhere("status", "pending");
  })
  .andWhere("total", ">", 100);
// → WHERE (status = 'open' OR status = 'pending') AND total > 100
```

**What to steal:** The `.where()` overloading pattern — let the same method accept
multiple shapes. TypeScript union types model this cleanly.

---

## Zod — Schema DSL

Zod's DSL feels like writing TypeScript types as values:

```ts
import { z } from "zod";

// Schema mirrors the shape of your data
const UserSchema = z.object({
  id:    z.string().uuid(),
  name:  z.string().min(2).max(100),
  email: z.string().email(),
  age:   z.number().int().min(0).max(150).optional(),
  role:  z.enum(["admin", "editor", "viewer"]).default("viewer"),
  tags:  z.array(z.string()).max(10),
});

// The DSL *is* the type
type User = z.infer<typeof UserSchema>;   // ← TypeScript type derived from DSL

// Runtime validation
const result = UserSchema.safeParse(rawInput);
if (!result.success) {
  console.log(result.error.issues);
}
```

**What to steal:** `z.infer<typeof Schema>` — your DSL can emit TypeScript types
via conditional types + `infer`. The schema and the type stay in sync automatically.

---

## RxJS — Reactive Pipeline DSL

RxJS is a DSL for async event streams:

```ts
import { fromEvent, interval } from "rxjs";
import { debounceTime, filter, map, switchMap, take } from "rxjs/operators";

// The pipeline is the program — each operator is a named step
fromEvent(searchInput, "input").pipe(
  map((e: Event) => (e.target as HTMLInputElement).value),
  debounceTime(300),                        // wait for user to stop typing
  filter(text => text.length > 2),          // skip very short queries
  switchMap(text => fetchSuggestions(text)),// cancel in-flight requests
  take(10),                                 // limit results
).subscribe(suggestions => render(suggestions));
```

**What to steal:** `.pipe()` as the entry point to a chain keeps the operator
list visually separate from the source. In TypeScript it enables precise
operator overloading via function overloads.

---

## Effect-TS — Effect DSL

Effect models programs as composable data structures:

```ts
import { Effect, pipe } from "effect";

// Programs are values — nothing runs until .runPromise
const program = pipe(
  Effect.tryPromise(() => fetch("/api/user/1")),
  Effect.flatMap(res => Effect.tryPromise(() => res.json())),
  Effect.map((user: { name: string }) => user.name.toUpperCase()),
  Effect.catchAll(err => Effect.succeed("UNKNOWN")),
);

// Execute
const name = await Effect.runPromise(program);
```

**What to steal:** Making "the program" a value (not a running side effect) lets
you compose, test, and retry it before it ever executes.

---

## Prisma — Schema External DSL

Prisma uses an external DSL in `.prisma` files:

```prisma
// schema.prisma — its own syntax, parsed by Prisma tooling
model User {
  id        Int      @id @default(autoincrement())
  email     String   @unique
  name      String?
  posts     Post[]
  createdAt DateTime @default(now())
}

model Post {
  id       Int    @id @default(autoincrement())
  title    String
  author   User   @relation(fields: [authorId], references: [id])
  authorId Int
}
```

**What to steal from Prisma's design:**
- Annotations (`@id`, `@unique`) separate concerns without nesting
- Relation fields live on both sides and are resolved by the tooling
- The DSL generates both the DB schema AND TypeScript types

---

## Express-style Router DSL

The HTTP routing DSL we all know:

```ts
// Express's DSL influenced every JS framework since
app.use(logger);                              // global middleware
app.use("/api", apiRouter);                  // mount sub-router

app.get("/users",          listUsers);
app.get("/users/:id",      getUser);
app.post("/users",         createUser);
app.put("/users/:id",      updateUser);
app.delete("/users/:id",   deleteUser);

// Middleware chain — each function is a named step
app.get("/admin/stats",
  authenticate,             // step 1
  authorize("admin"),       // step 2 (returns middleware)
  rateLimit({ max: 10 }),   // step 3
  getStats,                 // terminal handler
);
```

**What to steal:** Variadic middleware arguments on route methods. TypeScript can
type this as `...handlers: Handler[]` and still infer the final handler signature.
