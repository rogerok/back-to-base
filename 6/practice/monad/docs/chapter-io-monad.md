# Построй свою IO-монаду: полное руководство

> **Контекст.** Эта глава описывает всю архитектуру IO-монады, которую ты построил в рамках курса BatSchool.
> Материал покрывает путь от наивного императивного кода до Freer-кодирования с типизированными ошибками и do-notation на генераторах.
> Пререквизиты: базовый TypeScript, понимание tagged unions, async/await.

---

## 1. Центральная идея: программа — это данные

В обычном JS-коде side effects (вывод в консоль, чтение stdin, HTTP-запросы) происходят прямо при вызове функции:

```ts
const main = () => {
  const name = readLine("What is your name?");
  writeLine(`Hello, ${name}!`);
  const data = fetch("https://api.example.com/greet");
  writeLine(data);
};
```

Проблема: `main` нельзя протестировать без реального stdin и сети. Нельзя подменить реализацию `readLine` или `fetch`, не меняя сам `main`. Код **выполняет** эффекты немедленно — вместо того, чтобы **описывать**, что нужно сделать.

Решение: **разделить описание и выполнение**. `main` возвращает структуру данных — дерево инструкций. Отдельный интерпретатор решает, как именно выполнить каждую инструкцию: через реальный stdin, через браузерный `prompt` или через тестовый мок.

В Haskell `IO a` — это именно такое описание. `greeting :: IO ()` — значение, лежащее в переменной. Не функция, не thunk. GHC RTS обходит это дерево и выполняет реальные системные вызовы.

**Правило, которое легко нарушить:**

```ts
const greeting: IO<void> = ...        // значение — правильно
const greeting = (): IO<void> => ...   // thunk поверх IO — НЕПРАВИЛЬНО
```

`IO<A>` уже является отложенным вычислением. Второй слой ленивости (`() => IO<A>`) — лишний и вредный.

---

## 2. DSL: набор инструкций как tagged union

Первый шаг — определить тип `IO<A>`, описывающий вычисление, которое *когда-нибудь* вернёт значение типа `A`. Это tagged union из трёх вариантов:

| Инструкция | Что делает | `next` |
|---|---|---|
| `Pure(a)` | Завершает вычисление, возвращая `a` | нет |
| `ReadLine(next)` | Читает строку, передаёт в `next` | `(string) => IO<A>` — функция |
| `WriteLine(text, next)` | Печатает строку, продолжает | `IO<A>` — значение |
| `Fetch(url, next)` | HTTP-запрос, передаёт тело в `next` | `(string) => IO<A>` — функция |

Ключевое различие: у `ReadLine` поле `next` — это **функция**, потому что read возвращает результат и его нужно передать дальше. У `WriteLine` поле `next` — это просто следующая инструкция, потому что write ничего не возвращает.

`next` — это **continuation**: остаток программы после данной инструкции.

### Как выглядит программа-данные

```ts
const greeting: IO<void> = {
  tag: "writeLine",
  text: "What is your name?",
  next: {
    tag: "readLine",
    next: (name) => ({
      tag: "writeLine",
      text: `Hello, ${name}!`,
      next: { tag: "pure", value: undefined }
    })
  }
};
```

Это **чистые данные**. При создании этого объекта ни один байт не уходит в stdout, ни один байт не читается из stdin. Дерево лежит в памяти и ждёт интерпретатора.

---

## 3. Smart constructors: скрываем форму данных

Писать вложенные объекты вручную больно. Smart constructors создают минимальные инструкции:

```ts
const pure = <A>(value: A): IO<A> =>
  ({ tag: "pure", value });

const readLine: IO<string> =
  ({ tag: "readLine", next: pure });

const writeLine = (text: string): IO<void> =>
  ({ tag: "writeLine", text, next: pure(undefined) });
```

Обрати внимание: `readLine` — это **значение** (`const readLine: IO<string>`), а не функция. Точно как `getLine :: IO String` в Haskell.

Каждый конструктор создаёт инструкцию с тривиальным `next`: просто оборачивает результат в `Pure`. Настоящая композиция появится в следующем шаге.

---

## 4. bind — сердце монады

`bind` (он же `>>=`, `chain`, `flatMap`) — это то, что делает `IO` монадой:

```
bind : IO<A> -> (A -> IO<B>) -> IO<B>
```

По-русски: «возьми вычисление, которое вернёт `A`, и функцию, которая из `A` сделает новое вычисление `IO<B>`. Склей их в одно `IO<B>`».

### Как bind работает

`bind` **не выполняет** эффекты. Он рекурсивно перестраивает дерево, приклеивая продолжение `f` к каждому листу `Pure(a)`:

```
bind(Pure(a),            f) = f(a)                           — подставляем значение
bind(ReadLine(next),     f) = ReadLine(x => bind(next(x), f)) — протаскиваем f глубже
bind(WriteLine(t, next), f) = WriteLine(t, bind(next, f))     — протаскиваем f глубже
```

### Визуализация

Допустим, у нас есть:
```
writeLine("Name?")  →  [tag: writeLine, text: "Name?", next: Pure(undefined)]
```

После `bind(writeLine("Name?"), () => readLine)`:
```
[tag: writeLine, text: "Name?", next: [tag: readLine, next: pure]]
```

`bind` заменил `Pure(undefined)` на результат вызова `f(undefined)`, т.е. на `readLine`.

### Реализация

```ts
const bind = <A, B>(io: IO<A>, f: (a: A) => IO<B>): IO<B> => {
  switch (io.tag) {
    case "pure":
      return f(io.value);
    case "readLine":
      return { tag: "readLine", next: (x) => bind(io.next(x), f) };
    case "writeLine":
      return { tag: "writeLine", text: io.text, next: bind(io.next, f) };
  }
};
```

### Производные операции

Из `bind` выводятся ещё две:

```ts
// map (fmap): применить чистую функцию к результату
const map = <A, B>(io: IO<A>, f: (a: A) => B): IO<B> =>
  bind(io, (x) => pure(f(x)));

// andThen (>>): сделай первое, выброси результат, сделай второе
const andThen = <A, B>(first: IO<A>, second: IO<B>): IO<B> =>
  bind(first, () => second);

// sequence: выполни массив IO по порядку, собери результаты
const sequence = <A>(ios: IO<A>[]): IO<A[]> =>
  ios.reduce(
    (acc, item) => bind(acc, (arr) => bind(item, (x) => pure([...arr, x]))),
    pure([]),
  );
```

`sequence` — комбинатор, который берёт массив программ и возвращает одну программу, выдающую массив результатов. Полезен, когда нужно выполнить N одинаковых действий (например, fetch нескольких URL).

### Сборка программы через bind

```ts
const myProgram: IO<void> =
  bind(writeLine("What is your name?"), () =>
    bind(readLine, (name) =>
      bind(writeLine(`Hello, ${name}! How old are you?`), () =>
        bind(readLine, (age) =>
          writeLine(`Wow, ${name}, ${age} is a great age!`)))));
```

Каждый `bind` — это одна строка do-notation в Haskell:
```haskell
do
  putStrLn "What is your name?"    -- bind(writeLine(...), () =>
  name <- getLine                  --   bind(readLine, (name) =>
  putStrLn ("Hello, " ++ name)     --     bind(writeLine(...), () =>
  age <- getLine                   --       bind(readLine, (age) =>
  putStrLn ("Wow, " ++ name)       --         writeLine(...))))
```

---

## 5. Интерпретатор: единственное нечистое место

Всё, что было до этого — чистые данные. Теперь нужен кто-то, кто обойдёт дерево и выполнит реальные эффекты. Это `runIO` — аналог GHC RTS.

### Интерфейс World

```ts
interface World {
  readLine: () => Promise<string>;
  writeLine: (s: string) => Promise<void>;
  fetch: (url: string, options?: RequestInit) => Promise<string>;
}
```

`World` — это набор реальных реализаций эффектов. Dependency injection в чистом виде.

### runIO (наивный, до Freer)

```ts
const runIO = async <A>(io: IO<A>, world: World): Promise<A> => {
  let current: IO<any> = io;

  while (true) {
    switch (current.tag) {
      case "pure":
        return current.value;
      case "readLine": {
        const line = await world.readLine();
        current = current.next(line);   // подставляем результат в continuation
        break;
      }
      case "writeLine":
        await world.writeLine(current.text);
        current = current.next;         // переходим к следующей инструкции
        break;
      case "fetch": {
        const body = await world.fetch(current.url, current.options);
        current = current.next(body);
        break;
      }
    }
  }
};
```

Алгоритм:
1. Начинаем с корня дерева
2. Смотрим на `tag` текущего узла
3. Если `pure` — возвращаем значение, программа завершена
4. Если инструкция — выполняем реальный эффект через `world`, передаём результат в `next`, переходим к следующему узлу
5. Цикл `while(true)` вместо рекурсии — это trampoline для stack safety

**Ключевой момент**: `runIO` — это fold по AST. Каждый тег маппится в реальный эффект, результат подставляется в continuation, цикл крутится дальше.

### runIO с обработкой ошибок мира

В реальной реализации каждая ветка обёрнута в `try/catch`. Если `world.readLine()` бросит исключение (например, EOF), оно превращается в `fail(e)` — DSL-отказ, который `attempt` сможет поймать:

```ts
case "readLine": {
  try {
    const line = await world.readLine();
    current = current.cont(line);
  } catch (e) {
    current = fail(e);   // JS-исключение → DSL-отказ
  }
  break;
}
```

Без `try/catch` ошибки мира утекут мимо DSL: `attempt` их не увидит, они пролетят как обычные JS-исключения. Обёртка в `fail` — это граница между нетипизированным миром JS-исключений и типизированным каналом ошибок DSL.

---

## 6. Разные миры: одна программа, много сред

Одна и та же программа `myProgram` работает в браузере, в Node.js и в тестах — без единого изменения.

### Production Node.js мир

```ts
const productionNodeWorld: World = {
  readLine: () => rl.question(""),
  writeLine: async (s) => { console.log(s); },
  fetch: async (url, opts) => {
    const resp = await fetch(url, opts);
    return resp.text();
  },
};
```

### Браузерный мир

```ts
const browserWorld: World = {
  readLine: async () => prompt("") ?? "",
  writeLine: async (s) => { console.log(s); },
  fetch: async (url) => { /* ... */ },
};
```

### Тестовый мир

```ts
const makeTestWorld = (input: string[], fetchMock: Record<string, string>) => {
  const output: string[] = [];
  const strs = [...input];

  return {
    output,
    readLine: async () => {
      const last = strs.shift();
      if (typeof last === "undefined") {
        throw new Error("Mock can't be empty");   // fail loud!
      }
      return last;
    },
    writeLine: async (s: string) => { output.push(s); },
    fetch: async (url) => {
      if (!(url in fetchMock)) {
        throw new Error(`fetch to ${url} not mocked`);  // fail loud!
      }
      return fetchMock[url];
    },
  };
};
```

**Правило fail loud**: тестовый мир должен падать на незамоканных вызовах, а не возвращать пустую строку. Mock-as-default-empty — антипаттерн: тест зелёный там, где должен быть красный.

### Использование в тесте

```ts
const world = makeTestWorld(["Alice", "30"], { "https://api.test": "data" });
await runIO(myProgram, world);
expect(world.output).toEqual([
  "What is your name?",
  "Hello, Alice! How old are you?",
  "Wow, Alice, 30 is a great age!"
]);
```

---

## 7. Do-notation через генераторы

Вложенные `bind` уродливы. JS-генераторы позволяют записать ту же программу почти как Haskell do-notation.

### 7a. Наивный подход: yield + cast

Идея простая: генератор отдаёт (`yield`) IO-значение наверх, а `doIO` выполняет его через `bind` и передаёт результат обратно в генератор:

```ts
const myProgram = doIO(function* () {
  yield writeLine("Name?");
  const name = (yield readLine) as string;  // каст — некрасиво
  yield writeLine(`Hi, ${name}!`);
});
```

Проблема: `yield` всегда возвращает `unknown`, поэтому приходится кастовать каждый результат.

### 7b. Трюк Effect-TS: Symbol.iterator + YieldWrap

| Подход | Синтаксис | Минус |
|---|---|---|
| Наивный | `const x = (yield io) as string` | Каст в коде пользователя |
| Адаптер `_(io)` | `const x = yield* _(io)` | Лишняя сущность в API |
| `Symbol.iterator` (Effect-TS) | `const x = yield* io` | Сложнее реализация |

### Как работает трюк с `Symbol.iterator`

В финальном варианте (из Effect-TS) сам IO сделан `Iterable`. Когда ты пишешь `yield* io`, TypeScript:

1. Зовёт `io[Symbol.iterator]()` — получает одноразовый генератор
2. Первый `.next(undefined)` — генератор отдаёт `YieldWrap(io)` наверх
3. `doIO` распознаёт `YieldWrap`, выполняет завёрнутый эффект через `bind`, получает результат `A`
4. Передаёт `A` обратно через `gen.next(a)`
5. Генератор возвращает `{ done: true, value: a }`
6. `yield*` разворачивает это в `a` с типом `A`

### YieldWrap

```ts
class YieldWrap<T> {
  readonly _Y!: () => T;     // фантомное поле для типа
  constructor(readonly value: T) {}
}
```

`YieldWrap` — обходной приём по вариантности. Без обёртки объединения типов ошибок схлопываются неправильно. `YieldWrap` — непрозрачный newtype с фантомным полем, который заставляет TypeScript трактовать каждый yield как самостоятельный кирпич.

### mkIO — добавляем Symbol.iterator

```ts
const mkIO = <A, I extends Instr<any>>(freer: RawFreer<I, A>): Freer<I, A> => {
  Object.defineProperty(freer, Symbol.iterator, {
    value: function* () {
      return (yield new YieldWrap(this)) as A;
    },
  });
  return freer as Freer<I, A>;
};
```

`Object.defineProperty` используется, чтобы `[Symbol.iterator]` не светился в `JSON.stringify`.

### doIO

```ts
const doIO = <A>(genFn: () => IOGen<A>): Freer<Instr<any>, A> => {
  const gen = genFn();

  const walk = (v: unknown): Freer<Instr<any>, A> => {
    const result = gen.next(v);
    if (result.done) return pure(result.value);
    return bind(result.value.value, walk);  // result.value = YieldWrap
  };

  return walk(undefined);
};
```

`genFn` — это фабрика `() => Generator`, а не сам генератор, потому что генераторы мутабельны и одноразовые. Фабрика создаёт свежий генератор на каждый запуск.

### Финальный вид программы

```ts
const myProgram = doIO(function* () {
  yield* writeLine("What is your name?");
  const name = yield* readLine;
  yield* writeLine(`Hello, ${name}! How old are you?`);
  const age = yield* readLine;
  yield* writeLine(`Wow, ${name}, ${age} is a great age!`);
});
```

Никаких `as string`, никаких адаптеров. Типы выводятся корректно.

---

## 8. Ошибки как эффекты

### Проблема

`runIO` возвращает `Promise<A>`. Если `world.fetch` бросит — получим неопределённый `unknown` в `catch`. TypeScript не знает, какие ошибки возможны, и `try/catch` остаётся слепым.

### Решение: fail как инструкция

В монолитном IO `fail` — отдельный тег tagged union:

```ts
const fail = (error: unknown): IO<never> => ({
  tag: "fail",
  error,
});
```

В Freer-кодировании `fail` — это `impure` с инструкцией `{ tag: "fail", error }`. На уровне Freer это обычный `Impure`-узел, но с особой инструкцией:

```ts
const fail = <I extends Instr<any>, A>(error: unknown): Freer<I, A> => mkIO({
  tag: "impure",
  op: { tag: "fail", error } as unknown as I,
  cont: (e) => { throw e; },
});
```

`fail` — поглощающий элемент: что бы ты ни приклеил через `bind` после него, продолжение не вызывается, ошибка пробрасывается:

```ts
bind(fail("oops"), (x) => writeLine(x))  // writeLine никогда не вызовется
```

### attempt — делает программу тотальной

```ts
attempt(io)  // Freer<I, A> → Freer<I, Result<unknown, A>>
```

`attempt` превращает программу, которая может упасть, в программу, которая гарантированно завершается успехом. Ошибки переезжают на уровень значения:

```ts
type Result<E, A> = { ok: true; value: A } | { ok: false; error: E };
```

Реализация обходит дерево как `bind`, но в Freer проверяет `op.tag`, а не тег верхнего уровня:
- `tag === "pure"` → `pure({ ok: true, value })`
- `tag === "impure"` и `op.tag === "fail"` → `pure({ ok: false, error: op.error })`
- `tag === "impure"` и другая инструкция → рекурсивный `attempt` внутри `cont`

### Парные комбинаторы

```ts
// orElse — запасная ветка при ошибке
const orElse = (io, fallback) =>
  bind(attempt(io), (r) => r.ok ? pure(r.value) : fallback(r.error));

// mapError — трансформировать тип ошибки
const mapError = (io, f) =>
  orElse(io, (e) => fail(f(e)));
```

---

## 9. Freer — расцепляем bind и инструкции

### Проблема монолитного IO

В предыдущих частях `IO`, `bind` и инструкции склеены. Чтобы добавить `Sleep` или `Random`, нужно менять три места: тип `IO`, ветку в `bind`, ветку в `runIO`. Это нарушает принцип «открыт для расширения, закрыт для модификации».

### Идея Freer

Разделяем на два слоя:

1. **Инструкции** (`Instr`) — набор операций, которые умеет делать программа
2. **Монадическая структура** (`Freer`) — `Pure` + `Impure` с continuation, не зависит от конкретных инструкций

```ts
// Инструкции — каждая знает тип своего ответа через _resp
type TReadLine  = { _resp: string; tag: "readLine" };
type TWriteLine = { _resp: void;   tag: "writeLine"; text: string };
type TFail      = { _resp: never;  tag: "fail";      error: unknown };
type TFetch<R>  = { _resp: R;      tag: "fetch";     url: string; options?: RequestInit };

type Instr<R> = TFail | TFetch<R> | TReadLine | TWriteLine;
```

```ts
// Монадическая структура — НЕ зависит от конкретных инструкций
type RawFreer<I extends Instr<any>, A> =
  | { tag: "pure"; value: A }
  | { tag: "impure"; op: I; cont: (resp: I["_resp"]) => Freer<I, A> };
```

### Зачем `_resp`

Поле `_resp` — фантомный тип. В рантайме его нет (в объекте только `tag`, `text`, `url` и т.д.). Но на уровне типов оно говорит: «ответ на эту инструкцию имеет тип `string` / `void` / `never`». Благодаря этому `cont` получает правильный тип параметра.

### Что изменилось в bind

**Главное**: `bind` больше не знает про конкретные инструкции. Он работает только с `Pure` и `Impure`:

```ts
const bind = <I extends Instr<any>, A, B>(
  m: Freer<I, A>,
  f: (a: A) => Freer<I, B>,
): Freer<I, B> => {
  if (m.tag === "pure") return f(m.value);
  return mkIO({
    cont: (resp) => bind(m.cont(resp), f),
    op: m.op,
    tag: "impure",
  });
};
```

Два кейса вместо N. Добавление нового эффекта не требует изменения `bind`.

### Что изменилось в runIO

`runIO` теперь делает двойной switch: внешний по `current.tag` (`pure` / `impure`), внутренний по `current.op.tag` (конкретная инструкция):

```ts
const runIO = async <A>(io: Freer<Instr<any>, A>, world: World): Promise<A> => {
  let current = io;

  while (true) {
    switch (current.tag) {
      case "pure":
        return current.value;

      case "impure":
        switch (current.op.tag) {
          case "readLine": {
            const line = await world.readLine();
            current = current.cont(line);
            break;
          }
          case "writeLine":
            await world.writeLine(current.op.text);
            current = current.cont(undefined);
            break;
          case "fetch": {
            const body = await world.fetch(current.op.url, current.op.options);
            current = current.cont(body);
            break;
          }
          case "fail":
            throw current.op.error;
        }
    }
  }
};
```

### Smart constructors для Freer

```ts
const readLine: Freer<TReadLine, string> = mkIO({
  tag: "impure",
  op: { tag: "readLine" } as TReadLine,
  cont: pure,
});

const writeLine = (text: string): Freer<TWriteLine, void> => mkIO({
  tag: "impure",
  op: { tag: "writeLine", text } as TWriteLine,
  cont: () => pure(undefined),
});

const fetchUrl = (url: string, options?: RequestInit): Freer<TFetch<string>, string> => mkIO({
  tag: "impure",
  op: { tag: "fetch", url, options } as TFetch<string>,
  cont: pure,
});

const fail = <I extends Instr<any>, A>(error: unknown): Freer<I, A> => mkIO({
  tag: "impure",
  op: { tag: "fail", error } as unknown as I,
  cont: (e) => { throw e; },
});
```

Касты `as TReadLine`, `as unknown as I` — цена эмуляции GADT в TypeScript. TypeScript не умеет выразить «этот конкретный вариант union удовлетворяет ограничению `I extends Instr<any>`» без каста.

### Сравнение архитектур

| Подход | Где живёт bind | Цена нового эффекта | Несколько интерпретаторов? |
|---|---|---|---|
| Монолит (Часть 1-8) | switch по всем тегам в IO | 3 места (тип + bind + runIO) | да, но IO придётся обновить |
| Freer (Часть 10) | 2 кейса (pure/impure) | новый вариант в Instr + ветка в runIO | да, bind не трогается |

---

## 10. Полный путь выполнения: трейс от А до Я

Рассмотрим простую программу и проследим каждый шаг — от построения до исполнения.

### Программа

```ts
const prog = doIO(function* () {
  yield* writeLine("Name?");
  const name = yield* readLine;
  yield* writeLine(`Hi, ${name}!`);
});
```

### Фаза 1: построение дерева (чистая, без эффектов)

1. `doIO` вызывает `genFn()` — создаётся генератор
2. `walk(undefined)` — первый `gen.next(undefined)`
3. Генератор доходит до `yield* writeLine("Name?")`:
   - `writeLine("Name?")[Symbol.iterator]()` создаёт одноразовый генератор
   - Тот отдаёт `YieldWrap({ tag: "impure", op: { tag: "writeLine", text: "Name?" }, cont: ... })`
   - `walk` получает `{ done: false, value: YieldWrap(writeLine_node) }`
4. `walk` возвращает `bind(writeLine_node, walk)`:
   - `writeLine_node.tag === "impure"`, поэтому bind создаёт **новый** impure-узел:
   - `{ tag: "impure", op: writeLine_op, cont: (resp) => bind(writeLine_node.cont(resp), walk) }`

Генератор **заморожен** на первом yield. Остальные шаги программы ещё не построены — они материализуются лениво, когда интерпретатор вызовет `cont`.

**Результат фазы 1**: значение `prog` — это один узел `Impure(writeLine "Name?", <suspended continuation>)`.

### Фаза 2: интерпретация (runIO)

```ts
const world = makeTestWorld(["Alice"], {});
await runIO(prog, world);
```

**Итерация 1**:
- `current.tag === "impure"`, `current.op.tag === "writeLine"`
- `await world.writeLine("Name?")` — `world.output` = `["Name?"]`
- `current = current.cont(undefined)` — вызывается continuation
  - Внутри: `bind(writeLine_node.cont(undefined), walk)`
  - `writeLine_node.cont(undefined)` → `pure(undefined)` (тривиальный cont от writeLine)
  - `bind(pure(undefined), walk)` → `walk(undefined)`
  - `walk` зовёт `gen.next(undefined)` — генератор просыпается
  - Генератор доходит до `yield* readLine`:
  - Отдаёт `YieldWrap(readLine_node)`
  - `walk` возвращает `bind(readLine_node, walk)`
- `current` = `Impure(readLine, <suspended continuation>)`

**Итерация 2**:
- `current.op.tag === "readLine"`
- `const line = await world.readLine()` → `"Alice"` (из мока)
- `current = current.cont("Alice")`
  - `bind(readLine_node.cont("Alice"), walk)`
  - `readLine_node.cont("Alice")` → `pure("Alice")`
  - `bind(pure("Alice"), walk)` → `walk("Alice")`
  - `gen.next("Alice")` — генератор получает `"Alice"` как результат `yield* readLine`
  - `name = "Alice"`
  - Генератор доходит до `yield* writeLine("Hi, Alice!")`
  - Отдаёт новый `YieldWrap`
- `current` = `Impure(writeLine "Hi, Alice!", <continuation>)`

**Итерация 3**:
- `current.op.tag === "writeLine"`
- `await world.writeLine("Hi, Alice!")` — `world.output` = `["Name?", "Hi, Alice!"]`
- `current = current.cont(undefined)`
  - `walk(undefined)` → `gen.next(undefined)`
  - Генератор завершается (`return undefined`)
  - `result.done === true`, `walk` возвращает `pure(undefined)`
- `current` = `Pure(undefined)`

**Итерация 4**:
- `current.tag === "pure"` → `return undefined`

**Финал**: `world.output` = `["Name?", "Hi, Alice!"]`

---

## 11. Паттерны и принципы

### Паттерн 1: Interpreter (Command)

Вся архитектура — это паттерн Interpreter. Программа — AST (абстрактное синтаксическое дерево). `runIO` — интерпретатор. Разделение описания и выполнения даёт:
- Тестируемость (подмена World)
- Множество интерпретаторов (production, test, logging)
- Возможность инспектировать/трансформировать программу до выполнения

### Паттерн 2: Dependency Injection через World

`World` — интерфейс, от которого зависит интерпретатор. Программа не знает, откуда берутся строки и куда идёт вывод. Это dependency inversion в чистом виде.

### Паттерн 3: Continuation-Passing Style (CPS)

Поле `cont`/`next` — это continuation, «остаток программы». CPS позволяет строить произвольные последовательности шагов без мутации.

### Паттерн 4: Trampoline

`runIO` использует цикл `while(true)` вместо рекурсии. Это trampoline — превращение рекурсии в итерацию для stack safety. Без него глубокие программы вызовут stack overflow.

### Паттерн 5: Free/Freer Monad

Монадическая структура (pure + bind) даётся бесплатно для любого набора инструкций. `bind` пишется один раз навсегда. Новый эффект — это новый вариант в `Instr` и новая ветка в `runIO`.

### Паттерн 6: Phantom Types (GADT emulation)

`_resp` в инструкциях — фантомное поле, существующее только на уровне типов. Позволяет TypeScript вывести тип ответа для каждой инструкции, несмотря на то что язык не поддерживает GADT напрямую.

### Законы монад

Любая монада обязана соблюдать три закона. Наш `IO`/`Freer` — не исключение:

```
1. Left identity:   bind(pure(a), f)       ≡  f(a)
2. Right identity:  bind(m, pure)          ≡  m
3. Associativity:   bind(bind(m, f), g)    ≡  bind(m, a => bind(f(a), g))
```

- **Left identity**: обернуть значение в `pure` и сразу передать в `f` — то же самое, что просто вызвать `f(a)`.
- **Right identity**: `bind` с `pure` в качестве продолжения ничего не меняет.
- **Associativity**: порядок группировки `bind` не влияет на результат (хотя влияет на производительность — см. раздел 12 о квадратичности).

---

## 12. Известные ограничения

### Квадратичность left-associated bind

`bind(bind(bind(a, f), g), h)` переобходит дерево квадратичное число раз. На k-ом шаге `bind` обходит k узлов. Итого: 1 + 2 + ... + N = O(N^2).

Решение в боевых системах: type-aligned sequences (FTCQueue), Codensity transform.

### Stack overflow при построении

`bind` рекурсивен. Для глубоких чистых цепочек (`bind(pure(0), x => bind(pure(x+1), ...))` × 100k) стек переполнится ещё на этапе построения дерева.

### Потеря типов ошибок в Freer

В текущей реализации без параметра `E` в `Freer`, `fail` хранит `unknown`. Типизированный канал ошибок (как `Effect<A, E, R>`) требует добавления `E` обратно в тип `Freer`.

### Касты в smart constructors

`as unknown as I` в `fail`, `as TReadLine` в `readLine` — неизбежная цена эмуляции GADT в TypeScript. Касты спрятаны внутри конструкторов и не видны пользователю.

---

## Источники

- [BatSchool: Построй свою IO-монаду](https://school.bondiano.com/l/02-cs/io-monad) — материал курса
- Oleg Kiselyov, "Freer Monads, More Extensible Effects" — оригинальная статья про Freer encoding
- [Effect-TS](https://effect.website/) — промышленная реализация тех же идей на TypeScript
- Simon Peyton Jones, "Tackling the Awkward Squad" — как Haskell IO работает под капотом
