# Шпаргалка по fp-ts (к упражнениям)

## Task 1: Ord + contramap + concatAll

```ts
import { pipe } from "fp-ts/function";
import { concatAll } from "fp-ts/Monoid";
import * as N from "fp-ts/number";
import * as Ord from "fp-ts/Ord";
import * as RA from "fp-ts/ReadonlyArray";

// Ord по полю объекта
const ordByAge = pipe(
  N.Ord,
  Ord.contramap((p: Person) => p.age),
);

// Обратный порядок
const ordByAgeDesc = pipe(N.Ord, Ord.reverse, Ord.contramap((p: Person) => p.age));

// Объединение нескольких Ord (приоритет = порядок в массиве)
const M = Ord.getMonoid<Person>();
const complexOrd = concatAll(M)([ordByName, ordByAgeDesc]);

// Использование
complexOrd.compare(a, b); // -1 | 0 | 1
RA.sort(complexOrd)(array); // отсортированный массив
```

**Как работает**: `Ord.getMonoid` создаёт моноид, где `concat` двух Ord означает:
"сначала сравни по первому, если равны — по второму". `concatAll` сворачивает массив ордов в один.

---

## Task 2: IOEither — чтение + парсинг + валидация

```ts
import * as IOE from "fp-ts/IOEither";
import * as E from "fp-ts/Either";
import * as J from "fp-ts/Json";
import { flow, pipe } from "fp-ts/function";

// Обернуть синхронный эффект с возможной ошибкой
const readFile = IOE.tryCatch(
  () => readFileSync(path, "utf-8"),
  (e) => new MyError(String(e)),
);

// Цепочка: read → parse → validate
const load = pipe(
  readFile,
  IOE.map(J.parse),                          // IOE<Error, Either<Error, unknown>>
  IOE.flatMap(flow(validate, IOE.fromEither)), // IOE<Error, Config>
);

// Запуск
const result = load(); // Either<Error, Config>
```

**`J.parse`** возвращает `Either<Error, unknown>`, поэтому после `IOE.map(J.parse)` получается
`IOEither<E, Either<E2, unknown>>`. `IOE.flatMap` + `IOE.fromEither` "разворачивает" вложенный Either.

---

## Task 3: sequenceS(IO.Apply) — struct из эффектов

```ts
import { sequenceS } from "fp-ts/Apply";
import * as IO from "fp-ts/IO";
import * as R from "fp-ts/Random";

// Каждое поле — IO-эффект
const generate: IO.IO<MyStruct> = pipe(
  {
    name: R.randomElem(["Alice", "Bob"]),
    age: R.randomInt(18, 65),
    score: R.randomInt(0, 100),
  },
  sequenceS(IO.Apply),
);

// Запуск
const result = generate(); // MyStruct
```

**sequenceS** берёт `{ a: IO<A>, b: IO<B> }` и возвращает `IO<{ a: A, b: B }>`.
Аналог `Promise.all` но для struct вместо массива. Работает с любым Apply (IO, Task, Either, ...).

---

## Task 4: IO.Do + IO.bind — do-нотация

```ts
import * as IO from "fp-ts/IO";
import { pipe } from "fp-ts/function";

const program = pipe(
  IO.Do,                                    // IO<{}>
  IO.bind("x", () => someIO),              // IO<{ x: A }>
  IO.bind("y", () => anotherIO),           // IO<{ x: A, y: B }>
  IO.bind("z", ({ x, y }) =>               // доступ к предыдущим!
    IO.of(x + y),
  ),                                        // IO<{ x: A, y: B, z: C }>
  IO.map(({ x, y, z }) => result),         // IO<D>
);
```

**Когда использовать**: когда шаг N зависит от результатов шагов 1..N-1.
Без Do пришлось бы писать вложенные `IO.chain`.

---

## Task 5: Monoid + concatAll — агрегация

```ts
import { concatAll, struct } from "fp-ts/Monoid";
import * as N from "fp-ts/number";
import * as B from "fp-ts/boolean";

// Простое суммирование
const sum = concatAll(N.MonoidSum);
sum([1, 2, 3]); // 6

// Struct monoid — моноид для объекта
const statsMonoid = struct({
  total: N.MonoidSum,
  count: N.MonoidSum,
  allValid: B.MonoidAll,
});

concatAll(statsMonoid)([
  { total: 10, count: 1, allValid: true },
  { total: 20, count: 1, allValid: false },
]); // { total: 30, count: 2, allValid: false }
```

**Моноид** = `{ concat: (a, b) => result, empty: neutralElement }`.
`concatAll` — свёртка массива через concat, начиная с empty.

| Моноид | concat | empty |
|--------|--------|-------|
| `MonoidSum` | `a + b` | `0` |
| `MonoidProduct` | `a * b` | `1` |
| `MonoidAll` | `a && b` | `true` |
| `MonoidAny` | `a \|\| b` | `false` |

---

## Task 6: flow + NEA.map + sequence

```ts
import { flow } from "fp-ts/function";
import * as NEA from "fp-ts/NonEmptyArray";
import * as TE from "fp-ts/TaskEither";

// Обернуть async в TaskEither
const fetchUser = (id: number): TE.TaskEither<Error, User> =>
  TE.tryCatch(() => api.getUser(id), (e) => e as Error);

// map + sequence: [id] → [TE<E,A>] → TE<E, [A]>
const fetchUsers = flow(
  NEA.map(fetchUser),       // NEA<TE<Error, User>>
  TE.sequenceSeqArray,      // TE<Error, User[]>  (последовательно)
);

// Или параллельно:
const fetchUsersParallel = flow(
  NEA.map(fetchUser),
  TE.sequenceArray,         // TE<Error, User[]>  (параллельно)
);
```

**sequenceSeqArray** — последовательное выполнение (для side effects, интерактивности).
**sequenceArray** — параллельное (как `Promise.all`).

---

## Task 7: ReaderTaskEither — полный пайплайн

```ts
import * as RTE from "fp-ts/ReaderTaskEither";
import * as TE from "fp-ts/TaskEither";
import { pipe } from "fp-ts/function";

// Получить зависимость
const getDb = RTE.asks((env: AppEnv) => env.db);

// Поднять TaskEither в RTE
const findUser = (id: number) =>
  pipe(
    getDb,
    RTE.flatMap((db) =>
      RTE.fromTaskEither(
        TE.tryCatch(() => db.find(id), (e) => ({ type: "DbError" }))
      )
    ),
  );

// Синхронная валидация
const validate = (data: Input) =>
  isValid(data)
    ? RTE.right(data)
    : RTE.left({ type: "ValidationError" });

// Логирование (IO → RTE)
const log = (msg: string) =>
  pipe(
    RTE.asks((env: AppEnv) => env.logger),
    RTE.flatMap((logger) => RTE.fromIO(() => logger.info(msg))),
  );

// Полный пайплайн
const program = (input: Input) =>
  pipe(
    validate(input),
    RTE.flatMap(() => findUser(input.userId)),
    RTE.flatMap((user) => processOrder(user)),
    RTE.flatMap((order) =>
      pipe(
        log(`Order created: ${order.id}`),
        RTE.map(() => order),
      )
    ),
  );

// Запуск
const result = await program(input)(env)(); // Either<AppError, Order>
```

**RTE<R, E, A>** = `(env: R) => () => Promise<Either<E, A>>` — три эффекта в одном:
- **Reader**: неявная зависимость (env)
- **Task**: асинхронность
- **Either**: ошибки

Подъём контейнеров в RTE:
| Откуда | Функция |
|--------|---------|
| `Either<E, A>` | `RTE.fromEither` |
| `IO<A>` | `RTE.fromIO` |
| `IOEither<E, A>` | `RTE.fromIOEither` |
| `TaskEither<E, A>` | `RTE.fromTaskEither` |
| `Task<A>` | `RTE.fromTask` |
| чистое значение | `RTE.right(a)` / `RTE.of(a)` |
| ошибка | `RTE.left(e)` |
