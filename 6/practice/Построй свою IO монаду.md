# Free Monad Interpreter на JS/TS

В Haskell `IO a` — это не функция, которая "делает side effect". Это **описание** программы: дерево инструкций, которое runtime (GHC RTS) интерпретирует. Сама по себе `IO`-значение — чистые данные. Эффекты происходят только когда интерпретатор обходит это дерево.

В этом задании ты воспроизведёшь эту архитектуру на JS/TS:

1. Опишешь DSL — набор инструкций (`ReadLine`, `WriteLine`, `Fetch`, ...)
2. Реализуешь `bind` (`>>=`) — композицию инструкций с передачей результата
3. Напишешь интерпретатор — единственное место, где происходят side effects
4. Покажешь, что одну и ту же программу можно запустить в разных "мирах"
5. (★) Добавишь обработку ошибок, do-notation через генераторы и Freer encoding

---

## Главное правило, которое легко нарушить

**`IO<A>` — это значение, а не функция.** Программа на этом DSL — это `value`, лежащий в переменной. Не `() => value`, не `() => IO<A>`, не thunk. Просто значение.

```ts
const greeting: IO<void> = ...        // ✓ значение программы
const greeting = (): IO<void> => ...  // ✗ thunk поверх IO — лишний слой лени
```

Сравни с Haskell: `greeting :: IO ()` — это значение. Используется как `runIO greeting`, без `()`. Если ты ловишь себя на `() => IO<X>` — ты не понял main point. `IO<X>` уже отложенное вычисление, второй слой обёртки не нужен и вреден: он шепчет "вдруг что-то выполнится при импорте", а в этом и весь смысл — **ничего не выполняется, пока интерпретатор не пришёл**.

Это правило держим в голове до самого конца, особенно в Части 8 (`doIO`).

---

## Часть 0. Разминка — что не так с этим кодом?

```js
const main = () => {
  const name = readLine("What is your name?");
  writeLine(`Hello, ${name}!`);
  const data = fetch("https://api.example.com/greet");
  writeLine(data);
};
```

**Вопрос:** почему этот код _не может_ быть чистой функцией? Что мешает тестировать его без реального stdin и сети?

> **Подсказка:** подумай, в какой момент происходят side effects и можно ли подменить реализацию `readLine`/`fetch`, не меняя сам `main`.

---

## Часть 1. DSL — опиши свой язык

Определи тип `IO<A>` — tagged union, описывающий вычисление, которое _когда-нибудь_ вернёт значение типа `A`.

Начни с трёх инструкций:

|Инструкция|Аналог в Haskell|Что делает|
|---|---|---|
|`Pure(a)`|`pure a` / `return a`|Завершает вычисление, возвращая `a`|
|`ReadLine(next)`|`getLine >>= next`|Читает строку, передаёт результат в `next`|
|`WriteLine(text, next)`|`putStrLn s >> next`|Печатает строку, продолжает `next`|

Обрати внимание на разницу:

- `ReadLine.next` — это **функция** `(string) => IO<A>`, потому что read _возвращает_ значение
- `WriteLine.next` — это просто `IO<A>`, потому что write ничего не возвращает

Это именно то, как работает `>>=` в Haskell: `getLine >>= \name -> ...` — лямбда получает результат.

**Проверь себя** — попробуй вручную собрать такое дерево:

```ts
// Эта структура — ЧИСТЫЕ ДАННЫЕ, ноль side effects
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

**Вопрос:** `greeting` — это значение. Его можно положить в переменную, передать в функцию. Что произойдёт, когда мы его создадим?

---

## Часть 2. Конструкторы — умные обёртки

Писать вложенные объекты вручную — больно. Напиши конструкторы:

```ts
const pure = <A>(value: A): IO<A> => ???

const readLine: IO<string> = ???

const writeLine = (text: string): IO<void> => ???
```

> **Подсказка:** каждый конструктор создаёт "минимальную" инструкцию, у которой `next` просто оборачивает результат в `Pure`. Обрати внимание, что `readLine` — это **значение**, а не функция. Как `getLine` в Haskell — это `IO String`, а не `() -> IO String`.

---

## Часть 3. bind — сердце монады

`bind` (он же `>>=`, он же `chain`, он же `flatMap`) — это то, что делает `IO` монадой.

```
bind : IO<A> → (A → IO<B>) → IO<B>
```

По-русски: "возьми вычисление, которое вернёт `A`, и функцию, которая из `A` сделает новое вычисление `IO<B>`. Склей их в одно `IO<B>`."

`bind` **не выполняет** эффекты. Он рекурсивно перестраивает дерево, "приклеивая" continuation `f` к каждому листу `Pure(a)`:

```
bind(Pure(a),            f) = f(a)
bind(ReadLine(next),     f) = ReadLine(x => bind(next(x), f))
bind(WriteLine(t, next), f) = WriteLine(t, bind(next, f))
```

Реализуй:

```ts
const bind = <A, B>(io: IO<A>, f: (a: A) => IO<B>): IO<B> => {
  switch (io.tag) {
    case "pure":
      return ???
    case "readLine":
      return ???
    case "writeLine":
      return ???
  }
};
```

> **Подсказка:** для `Pure` — подставляешь значение в `f`. Для остальных — создаёшь такой же узел, но "протаскиваешь" `f` глубже через рекурсивный вызов `bind`.

**Бонус:** выведи из `bind` ещё две операции:

```ts
// map (fmap): IO<A> → (A → B) → IO<B>
const map = <A, B>(io: IO<A>, f: (a: A) => B): IO<B> => ???

// then (>>): IO<A> → IO<B> → IO<B>
// "сделай первое, выброси результат, сделай второе"
const then = <A, B>(first: IO<A>, second: IO<B>): IO<B> => ???
```

> **Замечание про сложность.** Твоя реализация будет работать, но обрати внимание: `bind(WriteLine(t, next), f)` создаёт **новый** узел и рекурсивно идёт в `next`. Это значит, что `bind(bind(bind(a, f), g), h)` — left-associated цепочка — переобходит дерево квадратичное число раз. Подержи это в голове, в Части 11 разберём, что с этим делать.
> 
> **Замечание про стек.** `bind` рекурсивен. Для глубоких чистых цепочек (`bind(pure(0), x => bind(pure(x+1), ...))` × 100k) словишь stack overflow ещё на этапе **построения** дерева, до всякой интерпретации. На реальных IO-программах это редко критично — между эффектами стек размотается, — но trampoline-safe эту реализацию не назвать.

---

## Часть 4. Напиши программу

Используя `bind`, `pure`, `readLine`, `writeLine`, опиши программу:

1. Напечатай `"What is your name?"`
2. Прочитай строку → `name`
3. Напечатай `"Hello, {name}! How old are you?"`
4. Прочитай строку → `age`
5. Напечатай `"Wow, {name}, {age} is a great age!"`

```ts
const myProgram: IO<void> = ???
```

Заметь: `myProgram` — это **значение**, лежащее в `const`. Не функция. Никаких `() => ...`.

Сравни с Haskell do-notation:

```haskell
myProgram :: IO ()
myProgram = do
  putStrLn "What is your name?"
  name <- getLine
  putStrLn ("Hello, " ++ name ++ "! How old are you?")
  age <- getLine
  putStrLn ("Wow, " ++ name ++ ", " ++ age ++ " is a great age!")
```

Каждая строка `x <- action` — это `bind(action, (x) => ...)`. Каждая строка без `<-` — это `then(action, ...)`. Do-notation — синтаксический сахар над `bind`.

---

## Часть 5. Интерпретатор — единственное нечистое место

В Haskell `main :: IO ()` — это просто значение. GHC RTS берёт его и **интерпретирует**: обходит дерево, выполняя реальные эффекты. Напиши свой "RTS".

Реализуй `runIO` — интерпретатор, который принимает `IO<A>` и "мир" (набор реальных реализаций эффектов):

```ts
interface World {
  readLine: () => Promise<string>;
  writeLine: (s: string) => Promise<void>;
}

const runIO = async <A>(io: IO<A>, world: World): Promise<A> => {
  let current: IO<any> = io;

  while (true) {
    switch (current.tag) {
      case "pure":
        return current.value;
      case "readLine":
        ???
      case "writeLine":
        ???
    }
  }
};
```

> **Подсказка:** для каждого тега — выполни реальный эффект через `world`, получи результат, подставь его в `next`, присвой в `current`. Цикл `while(true)` вместо рекурсии — это trampoline для stack safety.

---

## Часть 6. Разные миры

Напиши три реализации `World`:

**1. Браузерный мир** — `prompt` для ввода, `console.log` для вывода.

**2. Node.js мир** — `readline.createInterface` для ввода, `console.log` для вывода.

**3. Тестовый мир** — принимает массив строк как "ввод", собирает вывод в массив. Никаких side effects.

> **Важно про тесты.** Тестовый мир должен **падать** на незамоканных вызовах, а не возвращать `''`. Mock-as-default-empty — антипаттерн: тест зелёный там, где должен быть красный, потому что программа молча получила пустую строку. Базовое правило mocks — fail loud.

Проверь тестовым миром:

```ts
const test = async () => {
  const world = testWorld(["Alice", "30"]);
  await runIO(myProgram, world);  // myProgram, без скобок!
  console.assert(world.output[0] === "What is your name?");
  console.assert(world.output[1] === "Hello, Alice! How old are you?");
  console.assert(world.output[2] === "Wow, Alice, 30 is a great age!");
  console.log("All tests passed!");
};
```

**Ключевой момент:** одна и та же программа `myProgram` работает в браузере, в Node.js и в тестах — без единого изменения. Программа не знает, откуда берутся строки и куда идёт вывод.

---

## Часть 7. Расширение — Fetch

Добавь инструкцию `Fetch` в DSL:

```ts
| { tag: "fetch"; url: string; options?: RequestInit; next: (body: string) => IO<A> }
```

Что нужно обновить:

1. Конструктор `fetchUrl`
2. Кейс в `bind`
3. Кейс в `runIO`
4. Поле `fetch` в `World`
5. Мок в тестовом мире

Напиши программу:

```ts
const fetchProgram: IO<void> = ???
// 1. Напечатай "Fetching data..."
// 2. Сделай fetch на "https://httpbin.org/get"
// 3. Напечатай "Got {body.length} chars"
```

> **Замечание про маcштабируемость.** Заметил, что добавление одной инструкции потребовало правок в **пяти** местах? Это open-closed violation: ядро языка (`IO`, `bind`) знает обо всех инструкциях. В Части 10 покажу, как это разделить, чтобы новый эффект добавлялся **только** добавлением варианта в один union — без правок `bind` и `IO`.

---

## Часть 8 ★. Do-notation через генераторы

Вложенные `bind` уродливы. В JS есть генераторы — они позволяют написать почти как do-notation.

### 8.1. Наивная версия

```ts
type IOGen<A> = Generator<IO<unknown>, A, unknown>;

const doIO = <A>(genFn: () => IOGen<A>): IO<A> => ???
```

> **Подсказка:** вызови `gen.next(value)`, получи `result`. Если `result.done` — верни `pure(result.value)`. Иначе — `bind(result.value, ...)` с рекурсивным шагом. `doIO` принимает фабрику `() => IOGen`, а не сам генератор, потому что генераторы мутабельны и одноразовые — фабрика создаёт свежий генератор на каждый запуск интерпретатора.

### 8.2. КРИТИЧНО: doIO возвращает IO-значение, а не функцию

Это самое лёгкое место для ошибки. Смотри **на правильный** способ использования:

```ts
// ✓ ПРАВИЛЬНО — greeting это IO<void>, обычное значение
const greeting = doIO(function* () {
  yield writeLine('what is your name?')
  const name = yield* _(readLine)
  yield writeLine(`hello, ${name}`)
})

await runIO(greeting, world)  // используется как значение
```

```ts
// ✗ НЕПРАВИЛЬНО — это () => IO<void>, лишний thunk
const greeting = (): IO<void> => doIO(function* () { ... })

await runIO(greeting(), world)  // приходится звать как функцию
```

В чём разница? В первом варианте `greeting` — это **программа**. Во втором — **функция, которая создаёт программу**. Лишняя обёртка ломает главную метафору задания: "построение IO чисто и не имеет сайд-эффектов, IO можно класть в переменные". В Haskell `greeting :: IO ()`, не `greeting :: () -> IO ()`. Один в один.

Если ловишь себя на `() => IO<X>` — задай вопрос "зачем мне второй слой лени?". Ответа обычно нет.

### 8.3. Adapter — избавляемся от `as string`

В наивной версии есть проблема. Тип `IOGen<A> = Generator<IO<unknown>, A, unknown>` — третий type parameter (тип, который возвращает `gen.next(value)`) — это `unknown`. Каждый `yield` возвращает `unknown`, и приходится кастовать:

```ts
const name = (yield readLine) as string  // ✗ некрасиво и небезопасно
```

Это структурное ограничение TypeScript: генераторы не type-aligned, тип `yield`-выражения не зависит от того, что именно ты `yield`-ишь.

Решение — **adapter pattern из Effect-TS**. Идея: вместо прямого `yield io` используем wrapper-функцию `_(io)`, которая `yield*`-ит и возвращает уже типизированное значение:

```ts
type Adapter = <A>(io: IO<A>) => Generator<IO<A>, A, A>;

function* _<A>(io: IO<A>): Generator<IO<A>, A, A> {
  return (yield io) as A;  // каст спрятан внутри adapter
}
```

Теперь в программе:

```ts
const greeting = doIO(function* () {
  yield* _(writeLine('what is your name?'))
  const name = yield* _(readLine)        // name: string, без каста!
  yield* _(writeLine(`hello, ${name}`))
})
```

`yield*` (delegating yield) "разворачивает" вложенный генератор и возвращает его return value уже с правильным типом. Каст `as A` остаётся, но он **спрятан внутри `_`** — пользователь его не видит. Это и есть трюк Effect-TS.

> **Реалистичная оговорка.** TS не умеет в полностью типизированную do-notation. `fp-ts` забил и кастит на месте. Effect-TS раньше использовал adapter, как выше. Но в свежих версиях они придумали как обойтись и без него — про это в 8.4.

### 8.4. Без adapter: трюк Effect-TS с `Symbol.iterator`

Пользователи `_(io)`-стиля жаловались: лишняя сущность в API, нужно объяснять, документировать, не забывать пробрасывать в helper-ы. В свежих версиях Effect-TS `_` исчез — теперь пишут просто:

```ts
const elapsed = <A, E, R>(self: Effect<A, E, R>): Effect<A, E, R> =>
  Effect.gen(function* () {
    const startMillis = yield* now      // тип A корректно выводится
    const result = yield* self          // тип A корректно выводится
    const endMillis = yield* now
    console.log(`Elapsed: ${endMillis - startMillis}`)
    return result
  })
```

Никакого `_(...)`, никаких `as`. Как они это сделали?

**Главный трюк: сам `Effect` сделали `Iterable`.** Тогда `yield*` (delegating yield) делегирует прямо к нему, и TS вытаскивает тип из объявления iterator-а.

Вспомни сигнатуру: `Generator<TYield, TReturn, TNext>`. У `yield*` тип результата — это `TReturn` итератора, к которому делегируем. Effect-TS объявляет:

```ts
interface Effect<out A, out E = never, out R = never> {
  [Symbol.iterator](): EffectGenerator<this>
}

interface EffectGenerator<T extends Effect<any, any, any>> {
  next(...args: ReadonlyArray<any>): IteratorResult<
    YieldWrap<T>,           // TYield — что летит наружу к Effect.gen интерпретатору
    Effect.Success<T>       // TReturn — это и есть A, тип результата эффекта
  >
}
```

Когда ты пишешь `yield* self`, TS видит: "`self` это `Effect<A, E, R>`, его iterator имеет `TReturn = A`, значит `yield* self` имеет тип `A`". **Каст спрятан внутри iterator-а**, а тип вытекает из его объявления — пользователь ничего не кастует.

**Как это работает в рантайме.** `[Symbol.iterator]` возвращает single-shot генератор: один раз yield-ит wrapped self, потом завершается тем значением, которое ему передадут через `next()`:

```ts
class SingleShotGen<T, A> implements Iterator<T, A> {
  private done = false
  constructor(private readonly value: T) {}

  next(input: A): IteratorResult<T, A> {
    if (this.done) return { done: true, value: input }
    this.done = true
    return { done: false, value: this.value }
  }
}

// Effect.prototype получает Symbol.iterator:
Effect.prototype[Symbol.iterator] = function () {
  return new SingleShotGen(new YieldWrap(this))
}
```

Что происходит на `yield* self`:

1. Делегирующий генератор зовёт `self[Symbol.iterator]()` → `SingleShotGen`
2. Первый `.next(undefined)` → `{ done: false, value: YieldWrap(self) }`
3. Это значение всплывает наружу — к `Effect.gen` интерпретатору
4. `Effect.gen` распознаёт `YieldWrap`, выполняет завёрнутый effect, получает результат типа `A`
5. Передаёт `A` обратно через внешний `gen.next(a)`
6. `SingleShotGen.next(a)` теперь возвращает `{ done: true, value: a }`
7. `yield*` в твоём коде разворачивает это в `a` с типом `A`

Runtime поведение **точно такое же**, как было с `_(io)` — adapter тоже оборачивал effect, yield-ил его, return-ил response. Просто теперь обёрткой служит сам Effect через `Symbol.iterator`.

**Зачем `YieldWrap`?** Это вариантный workaround. Если бы iterator yield-ил голый `Effect<A, E, R>`, при инференсе `Effect.gen` нужно собирать union всех yield-нутых effect-ов (особенно `E1 | E2 | E3` — союз ошибок). Без обёртки эти union-ы коллапсируют типы неправильно из-за вариантности. `YieldWrap` — opaque newtype с phantom-полем, который ломает structural inference и заставляет TS трактовать каждый yielded effect как unit для union'а:

```ts
class YieldWrap<T> {
  readonly _Y!: () => T   // phantom для invariance
  constructor(readonly value: T) {}
}
```

**Перенесём приём в наш IO.** В точности тот же приём:

```ts
class YieldWrap<T> {
  readonly _Y!: () => T
  constructor(readonly value: T) {}
}

// Каждый smart-конструктор делает результирующий объект Iterable.
// Удобнее всего — общая функция-обёртка:
const mkIO = <A>(io: IO<A>): IO<A> => {
  ;(io as any)[Symbol.iterator] = function* () {
    return (yield new YieldWrap(this)) as A   // каст спрятан здесь
  }
  return io
}

const pure = <A>(value: A): IO<A> => mkIO({ tag: 'pure', value })
const readLine: IO<string> = mkIO({ tag: 'readLine', next: pure })
const writeLine = (text: string): IO<void> =>
  mkIO({ tag: 'writeLine', text, next: pure(undefined) })
// ... и так для каждого конструктора
```

`doIO` распаковывает `YieldWrap`:

```ts
type IOGen<A> = Generator<YieldWrap<IO<any>>, A, any>

const doIO = <A>(genFn: () => IOGen<A>): IO<A> => {
  const gen = genFn()
  const step = (value: unknown): IO<A> => {
    const result = gen.next(value)
    if (result.done) return pure(result.value)
    return bind(result.value.value, step)   // .value разворачивает YieldWrap
  }
  return step(undefined)
}
```

Использование — без `_`, без `as`:

```ts
const greeting = doIO(function* () {
  yield* writeLine('what is your name?')
  const name = yield* readLine                  // name: string, автоматически
  yield* writeLine(`hello, ${name}`)
})
```

Это и есть production-grade do-notation в TS. Никаких adapter-функций в API, типы выводятся корректно, единственный каст — внутри `Symbol.iterator`, скрыт от пользователя.

**Сравни три варианта:**

|Подход|Как пишется|Что плохо|
|---|---|---|
|Naive (`as A` снаружи)|`const x = (yield io) as A`|Каст у пользователя|
|Adapter (`_(io)`)|`const x = yield* _(io)`|Лишняя сущность в API|
|`Symbol.iterator` (Effect-TS)|`const x = yield* io`|Сложнее реализация|

### 8.5. Stack safety doIO

Внутри `doIO` ты делаешь `bind(result.value, step)` рекурсивно. На длинных генераторах это может уйти в стек. Для учебных программ из 5 шагов всё ок, но если хочешь играть всерьёз — гугли **Codensity transform** или **Reflection without remorse**. Для нашего курса достаточно знать, что проблема существует.

---

## Часть 9 ★. Ошибки как эффекты

### 9.0. Что вообще сейчас бросается?

Прежде чем чинить — посмотри внимательно, что именно может пойти не так в твоём текущем коде. Все три источника эффектов могут синхронно или асинхронно бросить JS-исключение, которое уйдёт через `Promise.reject` наружу из `runIO`:

- **`world.fetch`** — самый очевидный. `fetch()` reject-ится при network error (DNS, отвалился connection, CORS), при HTTP non-2xx если ты руками проверяешь `res.ok` (как в `createNodeJSWorld`), при `res.text()` если тело битое.
- **`world.readLine`** — `rl.question` может reject-нуться, если интерфейс закрыт (Ctrl+D / EOF) посреди ожидания ввода.
- **`world.writeLine`** — синхронный `stdout.write` может бросить `EPIPE` (broken pipe — например, если ты pipe-ишь в `head` и тот закрылся), `EBADF` если дескриптор закрыт, и т.д.
- **Ошибки внутри continuation**, переданной в `next`. `JSON.parse(body)` в твоём коде после fetch — обычное место, где прилетает `SyntaxError`. У тебя это сейчас тоже не отражено в типах.

Что говорит о всём этом твой текущий тип?

```ts
const runIO: <A>(io: IO<A>, world: World) => Promise<A>
```

**Ничего.** `Promise<A>` не отражает, что промис может reject-нуться, и какими ошибками. С точки зрения типа `runIO(program, world)` либо вернёт `A`, либо... что? `unknown`? `never`? TS не знает, ты не знаешь, callsite не знает. Каждый `try/catch` снаружи — слепой, ловит `unknown` и приходится `instanceof`-ить на ходу.

В Haskell, кстати, **та же проблема**: `IO a` тоже скрывает synchronous и asynchronous exceptions в типе, ты не видишь их в сигнатуре. Это известная критика Haskell-овского `IO`. Решения — `MonadError e`, `ExceptT e IO a`, библиотеки типа `safe-exceptions` и `unliftio`.

В Effect-TS пошли дальше и сделали это **частью базового типа**: `Effect<A, E, R>` — два параметра для success и error. Ошибки явные в сигнатуре. Скопируем подход.

### 9.1. Расширяем тип: `IO<A, E>`

Вместо `IO<A>` будет `IO<A, E>` — программа, которая либо вернёт `A`, либо упадёт с ошибкой типа `E`. Это **bifunctor**: ковариантна по обоим параметрам.

```ts
type IO<A, E = never> =
  | { tag: 'pure'; value: A }
  | { tag: 'fail'; error: E }                                       // ← новое
  | { tag: 'readLine'; next: (s: string) => IO<A, E> }
  | { tag: 'writeLine'; text: string; next: IO<A, E> }
  | { tag: 'fetch'; url: string; next: (body: string) => IO<A, E> }
```

Дефолт `E = never` означает: **по умолчанию программа не может упасть**. `IO<number>` (без второго параметра) — то же самое, что `IO<number, never>` — программа, у которой error-канал пустой. Это идеальная реклама системы: успех и отказ — равноправные граждане в типе.

Конструкторы перетипизируются:

```ts
const pure = <A>(value: A): IO<A, never> => ???
//                              ^^^^^ pure не падает

const fail = <E>(error: E): IO<never, E> => ???
//                              ^^^^^ fail никогда не возвращает A

const readLine: IO<string, never> = ???
const writeLine = (text: string): IO<void, never> => ???
```

Симметрия: `pure` универсально квантифицирован по `E` (поэтому `never`), `fail` — по `A` (поэтому `never`). `IO<never, never>` — программа, которая никогда не завершается (бесконечный цикл).

### 9.2. bind объединяет ошибки

Это самое важное место — `bind` теперь должен **объединять** error-каналы двух программ:

```ts
const bind = <A, B, E1, E2>(
  io: IO<A, E1>,
  f: (a: A) => IO<B, E2>
): IO<B, E1 | E2> => { ... }
```

Читай так: "если первая программа может упасть с `E1`, а continuation — с `E2`, то результат может упасть с `E1 | E2`". TS строит union ошибок автоматически по мере композиции. Если у тебя цепочка из 5 шагов с разными error-типами — финальный тип будет union всех пяти.

Кейс `Fail` в `bind`:

```
bind(Fail(e), _) = Fail(e)
```

`Fail` — поглощающий элемент: что бы ты ни binded после него, continuation **не вызывается**, ошибка пробрасывается дальше:

```ts
case "fail":
  return io;   // тип IO<never, E1>, что ассайнится в IO<B, E1 | E2>
```

### 9.3. attempt — делает программу total

`attempt` — обработчик. Превращает `IO<A, E>`, который может упасть, в `IO<Result<E, A>, never>`, который **гарантированно не падает**:

```ts
type Result<E, A> = { ok: true; value: A } | { ok: false; error: E }

const attempt = <A, E>(io: IO<A, E>): IO<Result<E, A>, never> => ???
//                                                     ^^^^^ error-канал стал пустым
```

Тип говорит: после `attempt` программа **точно** завершается успехом, отказы переехали в `Result` на уровне значения. Это и есть "программа становится тотальной относительно своих эффектов".

> **Подсказка:** `attempt` — интерпретация по структуре, как `bind`. На `Pure(a)` → `Pure({ ok: true, value: a })`. На `Fail(e)` → `Pure({ ok: false, error: e })`. На инструкциях — рекурсивный `attempt` внутри `next`.

Парные комбинаторы:

```ts
// Восстановление с фоллбэком
const orElse = <A, E1, E2>(
  io: IO<A, E1>,
  fallback: (e: E1) => IO<A, E2>
): IO<A, E2> => ???
//        ^^^ E1 ушёл из канала, остался только E2

// Маппинг ошибки
const mapError = <A, E1, E2>(
  io: IO<A, E1>,
  f: (e: E1) => E2
): IO<A, E2> => ???
```

Заметь как красиво: `orElse` именно **убирает** `E1` из типа результата — TS понимает, что после фоллбэка эта ошибка уже невозможна. Это compile-time гарантия.

### 9.4. Граница: JS exceptions ↔ DSL errors в runIO

Теперь самое тонкое. `runIO` стоит на границе двух миров: типизированных DSL-ошибок (`Fail` с типом `E`) и нетипизированных JS-исключений из `world.*`. Граница должна быть проведена явно.

```ts
const runIO = async <A, E>(io: IO<A, E>, world: World): Promise<A> => {
  let current: IO<any, any> = io
  while (true) {
    switch (current.tag) {
      case "pure":
        return current.value
      case "fail":
        throw current.error   // DSL fail → Promise.reject
      case "fetch":
        try {
          const body = await world.fetch(current.url)
          current = current.next(body)
        } catch (e) {
          current = { tag: 'fail', error: e }   // JS throw → DSL fail
        }
        break
      // аналогично для readLine, writeLine
    }
  }
}
```

Что важно понимать:

1. **JS exceptions из `world.*` ловятся** и конвертируются в `Fail`. Иначе `attempt` не смог бы их поймать — они бы протекли мимо DSL.
2. **Тип ошибки от `world.*` неизвестен** — это `unknown` (или твой собственный конкретный тип, если ты обернул `world.fetch` в типизированную обёртку, см. ниже).
3. **`runIO` всё ещё может reject-нуть промис** — если программа кончилась на `Fail`. Это правильное поведение: непойманные DSL-ошибки превращаются обратно в JS-exceptions на самом верху, как и должно быть на границе системы.

### 9.5. Типизированные обёртки над world

Чтобы тип `E` был осмысленным, а не вечным `unknown`, оборачивай эффекты в DSL-конструкторы, которые сами знают, какие ошибки они могут произвести:

```ts
class FetchError {
  readonly _tag = 'FetchError'
  constructor(readonly url: string, readonly cause: unknown) {}
}

class HttpError {
  readonly _tag = 'HttpError'
  constructor(readonly status: number, readonly url: string) {}
}

// Типизированный fetch с известными ошибками
const fetchUrl = (url: string): IO<string, FetchError | HttpError> =>
  ???   // внутри: bind с try/catch, который Fail-ит правильным типом
```

Теперь callsite **видит**, чем может упасть `fetchUrl`:

```ts
const program: IO<string, FetchError | HttpError | ParseError> = doIO(function* () {
  const body = yield* fetchUrl('https://api.example.com/data')
  const parsed = yield* parseJson(body)        // добавляет ParseError
  return parsed.name as string
})
```

Это compile-time трекинг ошибок: TS не даст тебе забыть обработать `HttpError` — он будет в типе, пока ты его не `attempt`-нул, не `orElse`-нул или не `mapError`-нул.

### 9.6. Defects vs failures (продвинутая тема)

В Effect-TS есть тонкое разделение:

- **Failures** — ожидаемые типизированные ошибки из канала `E`. То, на что программа умеет реагировать.
- **Defects** — неожиданные паники: `null`-pointer внутри чистой continuation, `OutOfMemory`, бесконечная рекурсия. Это **баги**, а не ошибки.

В Haskell аналогично: `throwIO` для sync exceptions vs async exceptions от RTS (timeouts, kill threads). Разные категории ловятся разными комбинаторами.

В нашем DSL пока хватит одной категории (`Fail`), но если будешь развивать — заведи `Die`/`defect` для непойманного, чтобы баги и валидационные ошибки не сваливались в одну корзину.

### Итого по типизации

```
ДО:    type IO<A>           — успех A, ошибки невидимы (unknown в Promise.reject)
ПОСЛЕ: type IO<A, E>        — успех A или явная ошибка E

pure       : A => IO<A, never>            — никогда не падает
fail       : E => IO<never, E>            — никогда не возвращает
bind       : IO<A,E1> => (A => IO<B,E2>) => IO<B, E1|E2>
attempt    : IO<A, E> => IO<Result<E, A>, never>
orElse     : IO<A,E1> => (E1 => IO<A,E2>) => IO<A, E2>
mapError   : IO<A,E1> => (E1 => E2) => IO<A, E2>
```

Программа, которая может фейлиться, теперь **обязана** говорить это в типе. Программа без отказов имеет `IO<A, never>` и ассайнится туда, где хотят `IO<A, любое>` (потому что `never` ⊆ всех типов). Compile-time гарантии вместо runtime сюрпризов.

---

## Часть 10 ★★. Freer encoding — расцепляем IO, bind и инструкции

В предыдущих частях `IO`, `bind` и набор инструкций склеены намертво. Чтобы добавить `Sleep` или `Random`, надо менять **три** места: тип `IO`, кейс в `bind`, кейс в `runIO`. Это open-closed violation, и весь смысл Free как "extensible effects" теряется.

Смысл Free monad — что монадическая структура (`Pure` + `bind`) **даётся бесплатно** для **любого** functor с инструкциями. То есть `bind` должен писаться **один раз навсегда**, а не пересматриваться при каждой новой инструкции.

### 10.1. Идея

Расщепи определение на два слоя:

```ts
// СЛОЙ 1: только инструкции, без монадической структуры
type InstrF<A> =
  | { tag: 'readLine'; next: (s: string) => A }
  | { tag: 'writeLine'; text: string; next: A }
  | { tag: 'fetch'; url: string; next: (body: string) => A }
  | { tag: 'fail'; error: unknown }

// СЛОЙ 2: Free над любым функтором
type Free<F, A> =
  | { tag: 'pure'; value: A }
  | { tag: 'impure'; instr: F /* of Free<F,A> */ }
```

Затем `IO<A> = Free<InstrF, A>`. `bind` определяется один раз через `InstrF.map` (нужен `Functor`-instance для `InstrF`) и больше **никогда не меняется**.

### 10.2. Freer — упрощённая версия для TS

В TypeScript писать proper `Functor`-instance больно (нет higher-kinded types). Поэтому используем **Freer** encoding (Oleg Kiselyov, "Freer Monads, More Extensible Effects"). Идея: вынести continuation наружу из инструкции:

```ts
// Инструкции — теперь у них нет параметра A, у каждой свой "ответный" тип
type Instr<R> =
  | { tag: 'readLine'; _resp: string }
  | { tag: 'writeLine'; text: string; _resp: void }
  | { tag: 'fetch'; url: string; _resp: string }
  | { tag: 'fail'; error: unknown; _resp: never }

// Freer над любой коллекцией инструкций
type Freer<I, A> =
  | { tag: 'pure'; value: A }
  | { tag: 'impure'; op: I; cont: (resp: any) => Freer<I, A> }

const bind = <I, A, B>(m: Freer<I, A>, f: (a: A) => Freer<I, B>): Freer<I, B> => {
  if (m.tag === 'pure') return f(m.value);
  return {
    tag: 'impure',
    op: m.op,
    cont: (resp) => bind(m.cont(resp), f)  // composition continuations
  };
};
```

Теперь:

- Добавление нового эффекта = новый вариант в `Instr`. **Bind не трогается.**
- Интерпретатор по-прежнему делает `switch (op.tag)` — но это уже не часть Freer, а часть твоего конкретного `runIO`. Можно иметь несколько разных интерпретаторов: `runProduction`, `runTest`, `runWithLogging`.

> **Бонус — `_resp` как phantom type.** Поле `_resp` нужно только для типизации: оно говорит "ответ на эту инструкцию имеет такой-то тип". В рантайме его нет. Это позволяет `cont` иметь правильный тип параметра в зависимости от инструкции (хоть и через каст внутри smart-конструкторов).

### 10.3. Bonus: сравни архитектуры

|Подход|Где живёт `bind`|Цена нового эффекта|Можно несколько интерпретаторов?|
|---|---|---|---|
|Монолит (Ч.1)|внутри `IO` switch|3 места|да, но `IO` придётся обновить|
|Free|один раз через `Functor`|новый функтор + интерпретатор|да|
|Freer|один раз через cont-композицию|новый вариант в `Instr`|да|

---

## Часть 11 ★★. Left-association и stack safety

В Части 3 я предупреждал: `bind(bind(bind(a, f), g), h)` имеет **квадратичную** сложность. Разберёмся, почему.

### 11.1. Демонстрация проблемы

Возьми наивный `bind` и построй цепочку из N левоассоциативных вызовов:

```ts
let prog: IO<number> = pure(0);
for (let i = 0; i < N; i++) {
  prog = bind(prog, (x) => pure(x + 1));  // left-assoc!
}
```

Каждый `bind` обходит всё накопленное дерево, чтобы дотянуться до `Pure` в самом низу. На N-ном шаге обход стоит O(N), общая стоимость — O(N²).

В do-notation через `doIO` каждый `yield` ассоциируется **влево** к предыдущим. То есть наивная реализация do-notation **квадратичная** на длинных программах.

### 11.2. Решения

Три классических подхода:

**(a) Codensity transform** (трюк Janis Voigtländer). Переписываем `IO` через CPS, что превращает любую ассоциацию bind в right-associated. O(N).

**(b) Reflection without remorse** (van der Ploeg, Kiselyov). Вместо одной continuation храним **type-aligned очередь** continuations (`FTCQueue`). Append в очередь — O(1), композиция — амортизированная O(1).

**(c) Freer + FTCQueue** — комбинация (b) с Freer encoding. Это то, как устроен **Effect-TS** и **Polysemy** в Haskell. Промышленное решение.

Для учебной задачи на 5 шагов это пофиг. Но если позиционируешь свой effect system как production-ready — без (a) или (b) ты собрал мину.

### 11.3. Stack safety в построении

Аналогично, наивный `bind` рекурсивен: он спускается до листа `Pure` через рекурсивные вызовы, что для глубокого дерева переполнит стек **на этапе построения IO** (не на этапе выполнения!). Trampoline в `runIO` тут не помогает — он касается только интерпретации.

Лечение — то же самое: Codensity или FTCQueue делают `bind` константным по стеку.

---

## Часть 12 ★★★. Как это устроено в реальном Haskell

Прочитай и разберись. В GHC `IO a` определён как:

```haskell
newtype IO a = IO (State# RealWorld -> (# State# RealWorld, a #))
```

Это функция, которая принимает **токен реального мира** и возвращает unboxed tuple: (новый токен, результат). Bind — композиция таких функций:

```haskell
(>>=) :: IO a -> (a -> IO b) -> IO b
IO m >>= f = IO $ \s0 ->
  case m s0 of
    (# s1, a #) -> let IO g = f a in g s1
```

Токен `State# RealWorld` — фантомный, он обеспечивает:

- **Линейность** — каждое `s` используется ровно один раз → эффекты упорядочены
- **Оптимизацию** — GHC стирает токен в рантайме, превращая `>>=` в прямые вызовы

**Вопрос:** в чём принципиальная разница между нашим подходом (free monad / AST) и подходом GHC (state passing)?

|Наш подход (Free / Freer)|GHC (State passing)|
|---|---|
|Строит AST, потом интерпретирует|Компилирует в прямые вызовы|
|Можно инспектировать программу|Нельзя (opaque функция)|
|Легко добавлять интерпретаторы|Один runtime|
|Overhead на аллокацию узлов|Zero-cost abstraction|

Подумай: почему GHC выбрал state passing, а не free monad? В каких случаях free monad предпочтительнее?

> **Подсказка:** ответ связан с (1) тем, что Haskell не нуждается в подмене runtime для тестов — он чистый по построению; (2) производительностью; (3) тем, что GHC IO **не extensible** — нельзя добавить свой эффект в `IO` снаружи. А в Free / Freer — можно.

---

## Итого

```
┌──────────────────────────────────────────────────┐
│  Программа (IO<A, E>)                            │
│  — чистые ДАННЫЕ (не функция!)                   │
│  — описание, не выполнение                       │
│  — A: тип результата, E: тип ошибки              │
│  — тестируемо, composable                        │
├──────────────────────────────────────────────────┤
│  bind (>>=)                                      │
│  — склеивает инструкции в цепочку                │
│  — объединяет error-каналы: E1 | E2              │
│  — НЕ выполняет эффекты                          │
│  — наивная реализация: O(N²) на left-assoc       │
├──────────────────────────────────────────────────┤
│  Инструкции (Instr / InstrF)                     │
│  — ОТДЕЛЬНО от bind (Free / Freer encoding)      │
│  — добавление = +1 вариант, без правок ядра      │
├──────────────────────────────────────────────────┤
│  do-notation (doIO + Symbol.iterator)            │
│  — yield* io работает напрямую, без adapter      │
│  — типы выводятся через TReturn iterator-а       │
│  — single-shot generator + YieldWrap             │
├──────────────────────────────────────────────────┤
│  Интерпретатор (runIO)                           │
│  — единственное место с side effects             │
│  — граница JS exceptions ↔ DSL Fail              │
│  — подменяем: browser / node / test / mock       │
│  — может быть несколько (production, test, log)  │
└──────────────────────────────────────────────────┘
```

Ключевая идея Haskell: **разделение описания и выполнения**. `IO` — не магия, а паттерн: опиши что делать, а кто-то другой решит как.

Три главных лайфхака на память:

1. **`IO<A, E>` — это значение.** Не функция. Не thunk. Значение программы лежит в переменной и ждёт интерпретатора. Если ловишь себя на `() => IO<X>` — спроси себя, зачем тебе второй слой лени.
    
2. **Ошибки — равноправный канал в типе.** Не молчаливые исключения, не `Promise.reject` с `unknown`. Если программа может упасть — это написано в её типе. `IO<A, never>` ↔ "точно не упадёт".
    
3. **do-notation бесплатна** через `Symbol.iterator`. Не нужен adapter. Не нужен `as`. `yield* effect` — и точка. Цена — немного машинерии в `Symbol.iterator`, но один раз и в одном месте.