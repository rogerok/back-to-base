# fp-ts Tips & Container Reference

## Containers by use case

### `pipe` — function/function
`import { pipe } from 'fp-ts/function'`

Passes a value through a sequence of functions left-to-right. The starting point of almost every fp-ts expression.

```ts
pipe(value, f1, f2, f3) // f3(f2(f1(value)))
```

---

### `Option<A>` — значение может отсутствовать (замена `null` / `undefined`)
`import * as O from 'fp-ts/Option'`

| Ситуация | Функция |
|---|---|
| Создать из nullable | `O.fromNullable(x)` |
| Создать по условию | `O.fromPredicate(predicate)(x)` |
| Преобразовать значение | `O.map(f)` |
| Цепочка опциональных шагов | `O.chain(x => O.fromNullable(x.field))` |
| Достать значение с дефолтом | `O.getOrElse(() => default)` |
| Свернуть в одно значение | `O.fold(() => onNone, onSome)` |
| Проверить наличие | `O.isSome(o)` / `O.isNone(o)` |

---

### `Either<E, A>` — операция может завершиться ошибкой (замена `try/catch`)
`import * as E from 'fp-ts/Either'`

| Ситуация | Функция |
|---|---|
| Успешное значение | `E.right(value)` |
| Ошибка | `E.left(error)` |
| Из try/catch | `E.tryCatch(() => expr, (e) => toError(e))` |
| Из условия | `E.fromPredicate(predicate, () => error)(value)` |
| Преобразовать правую | `E.map(f)` |
| Преобразовать ошибку | `E.mapLeft(f)` |
| Цепочка шагов | `E.chain(a => E.right(transform(a)))` |
| Свернуть | `E.fold(onLeft, onRight)` |
| Either → Option | `E.toOption(e)` |

---

### `IO<A>` — синхронный side effect (замена прямых вызовов)
`import * as IO from 'fp-ts/IO'`

`IO<A>` — это просто `() => A`. Ничего не выполняется до вызова.

| Ситуация | Функция |
|---|---|
| Обернуть side effect | `IO.of(value)` / `() => sideEffect()` |
| Преобразовать результат | `IO.map(f)` |
| Цепочка IO | `IO.chain(a => () => nextEffect(a))` |
| Запустить | `program()` |

---

### `Task<A>` — асинхронная операция без ошибки
`import * as T from 'fp-ts/Task'`

`Task<A>` — это `() => Promise<A>`. Аналог `IO` для async.

| Ситуация | Функция |
|---|---|
| Обернуть Promise | `() => promise` |
| Преобразовать | `T.map(f)` |
| Цепочка | `T.chain(a => () => nextPromise(a))` |
| Запустить | `program()` — возвращает Promise |

---

### `TaskEither<E, A>` — асинхронная операция с ошибкой (главный рабочий конь)
`import * as TE from 'fp-ts/TaskEither'`

`TaskEither<E, A>` = `() => Promise<Either<E, A>>`

| Ситуация | Функция |
|---|---|
| Обернуть async в try/catch | `TE.tryCatch(() => promise, toError)` |
| Успех | `TE.right(value)` |
| Ошибка | `TE.left(error)` |
| Из Either | `TE.fromEither(e)` |
| Из Option | `TE.fromOption(() => error)(option)` |
| Преобразовать правую | `TE.map(f)` |
| Цепочка async шагов | `TE.chain(a => TE.tryCatch(...))` |
| Обработать ошибку | `TE.mapLeft(f)` |
| Свернуть | `TE.fold(onLeft, onRight)` |
| Запустить | `program()` — возвращает `Promise<Either<E, A>>` |

---

### `Reader<Env, A>` — функция с неявной зависимостью (DI)
`import * as R from 'fp-ts/Reader'`

`Reader<Env, A>` — это просто `(env: Env) => A`.

| Ситуация | Функция |
|---|---|
| Получить весь env | `R.ask<Env>()` |
| Получить поле env | `R.asks((env: Env) => env.config)` |
| Преобразовать результат | `R.map(f)` |
| Цепочка | `R.chain(a => R.asks(env => ...))` |
| Запустить | `program(env)` |

---

### `ReaderTaskEither<Env, E, A>` — всё вместе: DI + async + errors
`import * as RTE from 'fp-ts/ReaderTaskEither'`

`RTE<Env, E, A>` = `(env: Env) => () => Promise<Either<E, A>>`

| Ситуация | Функция |
|---|---|
| Получить env | `RTE.ask<Env, E>()` |
| Получить поле env | `RTE.asks((env: Env) => env.config)` |
| Успех | `RTE.right(value)` |
| Ошибка | `RTE.left(error)` |
| Из TaskEither | `RTE.fromTaskEither(te)` |
| Из Either | `RTE.fromEither(e)` |
| Преобразовать | `RTE.map(f)` |
| Цепочка | `RTE.chain(...)` |
| Запустить | `program(env)()` — возвращает `Promise<Either<E, A>>` |

---

### `ReadonlyArray` — иммутабельные операции с массивами
`import * as RA from 'fp-ts/ReadonlyArray'`

| Ситуация | Функция |
|---|---|
| Фильтр | `RA.filter(predicate)` |
| Преобразование | `RA.map(f)` |
| Свернуть | `RA.reduce(init, (acc, a) => ...)` |
| Сортировка | `RA.sort(Ord)` |
| Группировка | `RA.groupBy(key)` |
| Найти | `RA.findFirst(predicate)` → `Option<A>` |

---

## Как сочетать контейнеры

```
sync  + no-error  → IO<A>
sync  + error     → Either<E, A>
async + no-error  → Task<A>
async + error     → TaskEither<E, A>
любой + DI        → Reader<Env, *> или ReaderTaskEither<Env, E, A>
nullable          → Option<A>
```

---

## Общие паттерны

### Последовательное выполнение (fail fast)
```ts
pipe(
  TE.right(input),
  TE.chain(step1),
  TE.chain(step2),
  TE.chain(step3),
)
```

### Параллельное выполнение
```ts
import { sequenceT } from 'fp-ts/Apply'
sequenceT(TE.ApplyPar)(task1, task2, task3)
```

### Option → Either
```ts
pipe(
  O.fromNullable(value),
  E.fromOption(() => ({ type: 'NotFound' }))
)
```

### Either → TaskEither
```ts
pipe(
  validate(input),   // Either<E, A>
  TE.fromEither,     // TaskEither<E, A>
  TE.chain(a => TE.tryCatch(() => fetchData(a), toError))
)
```

---

## Конвертация между контейнерами (task-11)

| Откуда → Куда | Функция |
|---|---|
| `nullable` → `Option` | `O.fromNullable(x)` |
| `Option` → значение | `O.getOrElse(() => default)` |
| `Option` → `Either` | `E.fromOption(() => error)(option)` |
| `Either` → `Option` | `E.toOption(either)` / `O.fromEither(either)` |
| `Either` → значение | `E.fold(onLeft, onRight)(either)` |
| `Option` → значение | `O.match(onNone, onSome)(option)` (= `O.fold`) |
| `Promise` → `TaskEither` | `TE.tryCatch(() => promise, toError)` |
| `TaskEither` → `Task` | `pipe(te, TE.fold(onLeft, onRight))` |
| `Option` → `TaskEither` | `TE.fromOption(() => error)(option)` |
| `Either<E, Option<A>>` → `Either<E, A>` | `pipe(e, E.chain(E.fromOption(() => error)))` |

### Откат при ошибке (orElse)
```ts
pipe(
  TE.fromOption(() => new Error('miss'))(O.fromNullable(cache.get(key))),
  TE.orElse(() => TE.tryCatch(() => fetch(url), toError))
)
```

### Свернуть TaskEither в Task (нет больше Either)
```ts
pipe(
  TE.tryCatch(() => fetch(url), (e) => `Failed: ${e}`),
  TE.fold(
    (err) => T.of(`Error: ${err}`),
    (val) => T.of(`OK: ${val}`)
  )
) // Task<string> — запустить: program()
```
