# map и then: как они работают через bind

## Главное, что нужно понять

`map` и `then` — это не самостоятельные операции. Они оба построены поверх `bind`.
Понимаешь `bind` — понимаешь всё остальное.

---

## Напоминание: что делает bind

`bind(io, f)` — обходит дерево `io` и заменяет каждый `Pure`-лист на `f(value)`.

```
bind(
  WriteLine("Q", next: Pure("x")),
  f
)
=
WriteLine("Q", next: f("x"))
```

`f` получает значение из `Pure` и возвращает новую программу `IO<B>`.

---

## map

### Сигнатура

```ts
map = <A, B>(io: IO<A>, f: (a: A) => B): IO<B>
```

Обрати внимание: `f` возвращает просто `B`, не `IO<B>`.

### Реализация

```ts
const map = <A, B>(io: IO<A>, f: (a: A) => B): IO<B> =>
  bind(io, (x) => pure(f(x)));
```

### Что происходит шаг за шагом

`map` передаёт в `bind` обёртку `(x) => pure(f(x))`.

Это значит: "возьми значение `x` из `Pure`, примени `f`, оберни результат обратно в `Pure`".

**Пример: `map(pure(5), x => x * 2)`**

```
map(pure(5), x => x * 2)
= bind(pure(5), x => pure(x * 2))

bind встречает Pure(5):
  → case "pure"
  → вызывает f(5) = pure(5 * 2) = pure(10)

Результат: Pure(10)
```

**Пример: `map(writeLine("hi"), () => 42)`**

```
map(writeLine("hi"), () => 42)
= bind(writeLine("hi"), x => pure(42))

bind встречает WriteLine("hi", next: Pure(undefined)):
  → case "writeLine"
  → { tag: "writeLine", text: "hi", next: bind(Pure(undefined), x => pure(42)) }

bind встречает Pure(undefined):
  → case "pure"
  → вызывает f(undefined) = pure(42)

Результат:
  WriteLine("hi")
    └─ Pure(42)
```

### Ключевое отличие от bind

| | f возвращает | нужна обёртка в pure? |
|---|---|---|
| `bind` | `IO<B>` — программу | нет, f сама строит IO |
| `map` | `B` — чистое значение | да, map оборачивает результат в pure |

Если передашь в `map` функцию которая возвращает `IO<B>` — получишь `IO<IO<B>>`.
Это не то что нужно. Для таких случаев используй `bind`.

---

## then

### Сигнатура

```ts
then = <A, B>(first: IO<A>, second: IO<B>): IO<B>
```

`second` — готовая программа, не функция. Результат `first` нас не интересует.

### Реализация

```ts
const then = <A, B>(first: IO<A>, second: IO<B>): IO<B> =>
  bind(first, () => second);
```

`() => second` — функция, которая **игнорирует аргумент** и всегда возвращает `second`.

### Что происходит шаг за шагом

**Пример: `then(writeLine("first"), writeLine("second"))`**

```
then(writeLine("first"), writeLine("second"))
= bind(writeLine("first"), () => writeLine("second"))
```

`writeLine("first")` это:
```
{ tag: "writeLine", text: "first", next: Pure(undefined) }
```

bind встречает writeLine:
```
→ case "writeLine"
→ { tag: "writeLine", text: "first", next: bind(Pure(undefined), () => writeLine("second")) }
```

bind встречает Pure(undefined):
```
→ case "pure"
→ вызывает f(undefined) = writeLine("second")
```

Итоговое дерево:
```
WriteLine("first")
  └─ WriteLine("second")
       └─ Pure(undefined)
```

Программа последовательно выполнит обе строки.

---

**Пример: `then(pure(999), pure(42))`**

```
then(pure(999), pure(42))
= bind(pure(999), () => pure(42))

bind встречает Pure(999):
  → case "pure"
  → вызывает f(999) = pure(42)   ← 999 проигнорировано

Результат: Pure(42)
```

Значение `999` выброшено. Остался только результат второй программы.

---

### Почему нельзя написать bind(second, pure)?

Это частая ошибка. Разберём:

```
bind(second, pure)
= bind(writeLine("second"), pure)
```

Здесь `first` вообще не участвует. `bind` обходит только `second`.
Получается просто `second` сам по себе — `first` нигде нет.

`then` должен начинаться с `first`, а `second` присоединяться к его концу.
Поэтому первым аргументом `bind` всегда идёт `first`.

---

## Итоговая таблица

| Функция | f | Что делает |
|---|---|---|
| `bind(io, f)` | `A => IO<B>` | заменяет `Pure(a)` на `f(a)` — f сама возвращает IO |
| `map(io, f)` | `A => B` | заменяет `Pure(a)` на `Pure(f(a))` — оборачивает результат |
| `then(first, second)` | нет | заменяет `Pure` в `first` на готовый `second`, значение `first` выброшено |

---

## Аналогия с промисами

```ts
// Promise
promise.then(x => x * 2)               // map  — f возвращает значение
promise.then(x => fetch("/api/" + x))  // bind — f возвращает Promise
promise.then(() => otherPromise)        // then — результат первого не нужен
```

В `Promise.then` всё это один метод, который сам решает развернуть ли вложенный промис.
В IO-монаде это три явных функции — поэтому механика видна.
