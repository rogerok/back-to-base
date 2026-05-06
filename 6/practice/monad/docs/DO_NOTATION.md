# doIO: do-notation через генераторы

---

## Часть 1. Что такое генератор

### Обычная функция vs генератор

Обычная функция запускается, выполняется целиком, возвращает одно значение — и всё.

```typescript
function normal() {
  console.log("a");
  console.log("b");
  return 42;
}

normal(); // "a" "b" → 42, всё случилось мгновенно
```

Генератор — это функция, которая умеет **паузиться** на полуслове. Она запускается, делает часть работы, отдаёт значение наружу (`yield`) и **ждёт**. Ждёт, пока её снова не позовут. При следующем вызове продолжает ровно с того места, где остановилась.

```typescript
function* gen() {
  console.log("шаг 1");
  yield "первое";         // пауза — отдаём "первое" наружу
  console.log("шаг 2");
  yield "второе";         // пауза — отдаём "второе" наружу
  console.log("шаг 3");
  return "готово";        // конец
}
```

Вызов `gen()` **не запускает** тело функции. Он только создаёт объект-генератор:

```typescript
const g = gen(); // тело ещё не выполнялось, console.log не звал
```

Запускается тело только при первом `g.next()`:

```typescript
g.next();
// → выводит "шаг 1"
// → доходит до yield "первое", останавливается
// → возвращает { done: false, value: "первое" }

g.next();
// → продолжает после первого yield
// → выводит "шаг 2"
// → доходит до yield "второе", останавливается
// → возвращает { done: false, value: "второе" }

g.next();
// → продолжает после второго yield
// → выводит "шаг 3"
// → доходит до return, заканчивается
// → возвращает { done: true, value: "готово" }

g.next();
// → уже исчерпан, ничего не происходит
// → возвращает { done: true, value: undefined } навсегда
```

### Ключевое: генератор помнит своё состояние

Между вызовами `g.next()` генератор "заморожен". Все локальные переменные живы — просто ждут. Это как поставить отладчик на точку останова.

```
gen()  ───── g.next() ───── g.next() ───── g.next() ─────►
               │               │               │
            "шаг 1"         "шаг 2"         "шаг 3"
           [пауза]          [пауза]         [конец]
            value:          value:          done: true
          "первое"        "второе"
```

---

## Часть 2. Двустороннее общение через yield

Вот главная магия, которую многие пропускают.

`yield` — это **канал в обе стороны**:
- **наружу** идёт то, что стоит справа от `yield` (в `.value`)
- **внутрь** идёт то, что передаётся в следующий `.next(значение)` — и именно это становится **результатом yield-выражения**

```typescript
function* dialog() {
  const ответ = yield "Как тебя зовут?";  // ← наружу идёт вопрос
  //                                          ← внутрь придёт ответ
  console.log("Привет,", ответ);
}

const g = dialog();

const { value: вопрос } = g.next();    // запустили, получили вопрос
console.log(вопрос);                   // "Как тебя зовут?"

g.next("Слава");                       // передаём ответ внутрь
// → console.log выведет "Привет, Слава"
```

Пошагово:

```
g.next()          → генератор стартует, доходит до yield
                    наружу: "Как тебя зовут?"
                    генератор ЗАМЕР, ждёт

g.next("Слава")   → генератор оживает, "Слава" становится значением yield
                    ответ = "Слава"
                    продолжает выполнение
```

### Важный нюанс: первый .next() игнорирует аргумент

```typescript
g.next("это игнорируется"); // первый вызов — аргумент выбрасывается
```

Почему? Некуда положить. Первый `.next()` только *запускает* генератор. До первого `yield` ещё не было выражения, которое могло бы принять значение. Аргумент некуда деть, поэтому JS его молча выбрасывает.

---

## Часть 3. Причём тут IO-монада

Вспомним, как выглядит программа через `bind`:

```typescript
// Спросить имя, поздороваться
const program = bind(writeLine("Как тебя зовут?"), () =>
  bind(readLine, (name) =>
    writeLine(`Привет, ${name}!`)));
```

Это дерево инструкций:

```
writeLine("Как тебя зовут?")
  └── next: readLine
              └── next: (name) => writeLine(`Привет, ${name}!`)
                                    └── next: pure(undefined)
```

Читать такое в 5+ уровней — больно. Хочется писать линейно:

```typescript
// Хочется вот так:
yield writeLine("Как тебя зовут?");
const name = yield readLine;
yield writeLine(`Привет, ${name}!`);
```

**Идея doIO:** взять генератор, который yield-ит IO-инструкции одну за другой, и **автоматически** собрать из этого то же самое IO-дерево через `bind`. Снаружи — линейный код. Внутри — тот же самый граф инструкций.

---

## Часть 4. Параллель: yield ↔ bind

Посмотри на соответствие:

```
bind-версия:                         generator-версия:

bind(writeLine("вопрос"), () =>      yield writeLine("вопрос")
  bind(readLine, (name) =>           const name = yield readLine
    writeLine(`Привет, ${name}!`)))  yield writeLine(`Привет, ${name}!`)
```

Каждый `yield io` — это "выполни этот IO-шаг, а потом продолжай". Это в точности то, что делает `bind(io, продолжение)`.

Значение `yield readLine` = результат выполнения `readLine` в мире = строка, которую ввёл пользователь. В bind-версии это `(name)` в `bind(readLine, (name) => ...)`.

| Концепция | В bind | В генераторе |
|---|---|---|
| "выполни этот IO, потом продолжай" | `bind(io, f)` | `yield io` |
| "результат предыдущего шага" | аргумент `f` | значение yield-выражения |
| "конец программы" | `pure(значение)` | `return значение` |

---

## Часть 5. Почему genFn — фабрика, а не генератор

Генератор — **одноразовый и мутабельный объект**. Один прогон — и он исчерпан:

```typescript
function* counter() {
  yield 1;
  yield 2;
  yield 3;
}

const g = counter();
g.next(); // { value: 1, done: false }
g.next(); // { value: 2, done: false }
g.next(); // { value: 3, done: false }
g.next(); // { value: undefined, done: true }
g.next(); // { value: undefined, done: true }  ← мёртв навсегда
```

IO-значение должно быть **переиспользуемым** — запустить ту же программу дважды, с разными мирами, в тесте:

```typescript
// ✗ НЕПРАВИЛЬНО: генератор передать напрямую
const gen = myProgramGen(); // один генератор
const program = doIO(gen);
await runIO(program, world1); // использовали генератор — он мёртв
await runIO(program, world2); // попытка второго прогона — пусто, сломается

// ✓ ПРАВИЛЬНО: передать фабрику — функцию, создающую генератор
const program = doIO(function* () { /* ... */ });
await runIO(program, world1); // doIO вызывает genFn() → свежий генератор №1
await runIO(program, world2); // doIO вызывает genFn() → свежий генератор №2
```

Каждый `runIO` получает чистый, незатронутый генератор с самого начала.

---

## Часть 6. Реализация doIO — построчно

```typescript
type IOGen<A> = Generator<IO<unknown>, A, unknown>;

export const doIO = <A>(genFn: () => IOGen<A>): IO<A> => {
  const gen = genFn();         // (1)

  const walk = (v?: unknown) => {
    const result = gen.next(v); // (2)

    if (result.done) {          // (3)
      return pure(result.value);
    }

    return bind(result.value, walk); // (4)
  };

  return walk();               // (5)
};
```

**(1) `const gen = genFn()`**
Создаём один генератор на весь этот IO. `walk` — замыкание: она видит `gen` из внешней области видимости. Все последующие вызовы `walk` работают с одним и тем же объектом `gen`, продвигая его вперёд.

**(2) `gen.next(v)`**
Делаем шаг. Если `v` — это "Alice" (результат предыдущего readLine), то внутри генератора `yield readLine` вернёт "Alice". Если `v` — `undefined` (writeLine вернул void), то `yield writeLine(...)` вернёт `undefined`, и это не страшно — его обычно не ловят.

**(3) `if (result.done)`**
Генератор добрался до `return`. `result.value` — это то, что вернул `return` в теле генератора. Оборачиваем в `pure` — программа завершена, результат получен.

**(4) `bind(result.value, walk)`**
`result.value` — это IO-инструкция, которую `yield` выдал наружу (например, `readLine` или `writeLine("что-то")`). `bind(io, walk)` означает: "когда этот IO будет выполнен, возьми результат и позови `walk` с ним". `walk` снова вызовет `gen.next(результат)`, чем продвинет генератор к следующему `yield`.

**(5) `return walk()`**
Первый запуск без аргумента. `v = undefined`. `gen.next(undefined)` — первый вызов, аргумент игнорируется JS-рантаймом. Генератор стартует и идёт до первого `yield`.

---

## Часть 7. Почему `walk()`, а не `walk(gen.next().value)`

Это была ошибка на пути к правильному решению. Разберём почему она ломает код.

### Что происходит при `walk(gen.next().value)`:

```
gen.next()        → генератор делает ШАГ 1, достигает yield writeLine("вопрос")
                    возвращает { done: false, value: writeLine("вопрос") }

walk( writeLine("вопрос") )    ← v = IO-объект writeLine

  gen.next( writeLine("вопрос") )
  → генератор делает ШАГ 2 (!!), принимает IO-объект как значение yield 1
  → достигает yield readLine
  → возвращает { done: false, value: readLine }

  return bind(readLine, walk)
```

**Что не так:**
- `gen.next()` до `walk` — шаг 1, получили `writeLine("вопрос")`
- `gen.next(writeLine("вопрос"))` внутри `walk` — шаг 2, `writeLine("вопрос")` использован как *значение*, которое получил генератор
- В IO-дерево попал только `readLine`. `writeLine("вопрос")` потерян навсегда

Итоговое дерево: `bind(readLine, walk)` — первый шаг вообще не выполнится.

### Что происходит при `walk()`:

```
walk()  →  v = undefined

  gen.next(undefined)   → генератор делает ШАГ 1, достигает yield writeLine("вопрос")
                          возвращает { done: false, value: writeLine("вопрос") }

  return bind(writeLine("вопрос"), walk)
```

Всё правильно. `writeLine("вопрос")` — первая инструкция в дереве. `walk` будет вызвана только когда интерпретатор её выполнит.

---

## Часть 8. Что делает bind внутри — подробная трассировка

Прежде чем смотреть на `doIO` целиком, разберём что именно происходит внутри `bind` для каждого тега. Это поможет не держать две абстракции одновременно.

### Вспомним реализацию bind

```typescript
const bind = <A, B>(io: IO<A>, f: (a: A) => IO<B>): IO<B> => {
  switch (io.tag) {
    case "pure":
      return f(io.value);                                         // (a)

    case "writeLine":
      return { tag: "writeLine", text: io.text,
               next: bind(io.next, f) };                         // (b)

    case "readLine":
      return { tag: "readLine",
               next: (x) => bind(io.next(x), f) };              // (c)

    case "fetch":
      return { tag: "fetch", url: io.url,
               next: (body) => bind(io.next(body), f) };        // (d)
  }
};
```

Три правила, которые надо запомнить:

| Случай | Что делает bind |
|---|---|
| `pure(x)` | **сразу вызывает** `f(x)`, никакого узла не создаёт |
| `writeLine(text)` | создаёт новый writeLine-узел, **рекурсивно** вызывает `bind` на его `next` |
| `readLine` | создаёт новый readLine-узел, оборачивает `f` в **замыкание** — оно вызовется позже |

Ключевое: `pure` и `writeLine` обрабатываются **немедленно** при вызове `bind`. `readLine` и `fetch` — **откладывают** `f` до момента, когда мир даст значение.

---

### Трассировка bind — шаг 1: writeLine

`walk()` вернула `bind(writeLine("Name?"), walk)`. Смотрим что происходит внутри `bind`:

```
bind(  writeLine("Name?"),  walk  )
         ↑                   ↑
         io                  f

io.tag = "writeLine"  →  попадаем в case (b)

io.next = ?
```

Что такое `writeLine("Name?").next`? Посмотри на конструктор:

```typescript
const writeLine = (text: string): IO<void> => ({
  tag: "writeLine",
  text,
  next: pure(undefined),   // ← минимальное "продолжение": просто вернуть void
});
```

Значит `io.next = pure(undefined)`.

```
bind( writeLine("Name?"), walk )

  case "writeLine":
    return {
      tag: "writeLine",
      text: "Name?",
      next: bind( pure(undefined), walk )   ← рекурсивный вызов bind
    }
```

Теперь раскрываем `bind(pure(undefined), walk)`:

```
bind( pure(undefined), walk )

  case "pure":
    return walk(undefined)   ← сразу вызываем walk с undefined!
```

**Важно: `walk` вызывается прямо сейчас, во время построения дерева.**

`walk(undefined)` делает шаг генератора:

```
walk(undefined)
  gen.next(undefined)
    → генератор шагает к следующему yield: readLine
    → возвращает { done: false, value: readLine }

  return bind( readLine, walk )
```

Раскрываем `bind(readLine, walk)`:

---

### Трассировка bind — шаг 2: readLine

```
bind( readLine, walk )
       ↑          ↑
       io          f

readLine = { tag: "readLine", next: pure<string> }
           где  next = (s: string) => pure(s)   ← конструктор readLine

io.tag = "readLine"  →  попадаем в case (c)

  return {
    tag: "readLine",
    next: (x) => bind( io.next(x), walk )
  }
```

Раскроем `io.next(x)`:

```
io.next = (s: string) => pure(s)   ← это поле конструктора readLine

io.next(x) = pure(x)

Значит:

  next: (x) => bind( pure(x), walk )
             = (x) => walk(x)         ← bind(pure(x), f) = f(x)
```

Итого `bind(readLine, walk)` возвращает:

```
{
  tag: "readLine",
  next: (x) => walk(x)   ← замыкание. x придёт от мира. walk НЕ вызвана.
}
```

**Генератор заморожен на `yield readLine`. Замыкание `(x) => walk(x)` лежит и ждёт.**

---

### Что в памяти после doIO — точная картина

Собираем всё вместе. `doIO` вернул результат `bind(writeLine("Name?"), walk)`, что развернулось в:

```
{
  tag: "writeLine",
  text: "Name?",
  next: {                        ← это результат walk(undefined)
    tag: "readLine",
    next: (x) => walk(x)        ← замыкание, x придёт позже
  }
}
```

Генератор **уже прошёл оба** первых шага (`yield writeLine` и `yield readLine`) и сейчас заморожен внутри `yield readLine`, ожидая значения.

Почему `writeLine` не создал барьера, а `readLine` создал? Потому что `bind` для `writeLine` рекурсивно разворачивает `next`, и натыкается на `pure(undefined)`, который **немедленно** вызывает `walk` дальше. А `bind` для `readLine` создаёт функцию-замыкание — барьер, который не позволяет идти дальше без внешнего значения.

---

### Трассировка: "Alice" проходит через замыкание

```
runIO видит { tag: "writeLine", text: "Name?" }
  → world.writeLine("Name?")  — вывели "Name?"
  → переходим к next

runIO видит { tag: "readLine", next: (x) => walk(x) }
  → world.readLine()  — пользователь вводит "Alice"
  → вызываем next("Alice")  = walk("Alice")
```

`walk("Alice")` — генератор получает значение:

```
walk("Alice")                   // v = "Alice"
  gen.next("Alice")
    → генератор оживает
    → "Alice" — результат yield readLine → name = "Alice"
    → идёт к: yield writeLine("Hi, Alice!")
    → ПАУЗА
    → { done: false, value: writeLine("Hi, Alice!") }

  return bind( writeLine("Hi, Alice!"), walk )
```

Снова разворачиваем `bind(writeLine("Hi, Alice!"), walk)`:

```
bind( writeLine("Hi, Alice!"), walk )

  case "writeLine":
    return {
      tag: "writeLine",
      text: "Hi, Alice!",
      next: bind( pure(undefined), walk )
          = walk(undefined)              ← немедленно вызываем walk
    }

walk(undefined)
  gen.next(undefined)
    → генератор оживает
    → нет больше yield — return undefined
    → { done: true, value: undefined }

  result.done = true
  return pure(undefined)
```

`bind(writeLine("Hi, Alice!"), walk)` полностью раскрылся в:

```
{
  tag: "writeLine",
  text: "Hi, Alice!",
  next: pure(undefined)      ← конец программы
}
```

```
runIO видит { tag: "writeLine", text: "Hi, Alice!" }
  → world.writeLine("Hi, Alice!")  — вывели "Hi, Alice!"
  → переходим к next

runIO видит { tag: "pure", value: undefined }
  → return undefined  ✓  программа завершена
```

---

### Резюме: почему writeLine "прозрачный", а readLine — "барьер"

```
bind(writeLine(t), f):
  создаёт узел  →  рекурсивно вызывает bind(next, f)
                →  next = pure(undefined)
                →  bind(pure(undefined), f) = f(undefined)
                →  f вызывается СРАЗУ
                →  генератор идёт дальше без остановки

bind(readLine, f):
  создаёт узел  →  оборачивает f в (x) => bind(io.next(x), f)
                →  это ЗАМЫКАНИЕ, никто его не вызывает сейчас
                →  генератор заморожен, ждёт x от мира
```

Именно поэтому doIO строит дерево "пачками": прокручивает все writeLine подряд, пока не упрётся в первый readLine/fetch — там строит замыкание и останавливается. Когда мир даёт значение, замыкание раскрывается и процесс продолжается с того места.

---

## Часть 9. Полная сквозная трассировка

Теперь соединяем всё вместе. Программа:

```typescript
const program = doIO(function* () {
  yield writeLine("Name?")
  const name = (yield readLine) as string
  yield writeLine(`Hi, ${name}!`)
})
```

**Фаза 1 — doIO строит дерево (всё синхронно, нет side effects):**

```
doIO вызван
  gen = genFn()               // генератор создан, не стартовал

  walk()
    gen.next(undefined)       // шаг 1: идём до первого yield
      → { done: false, value: writeLine("Name?") }

    bind( writeLine("Name?"), walk )

      case "writeLine":
        → { tag: "writeLine", text: "Name?",
            next: bind( pure(undefined), walk ) }

        bind( pure(undefined), walk )
          case "pure":
            → walk(undefined)       // шаг 2: идём до следующего yield

              gen.next(undefined)
                → { done: false, value: readLine }

              bind( readLine, walk )

                case "readLine":
                  → { tag: "readLine",
                      next: (x) => walk(x) }   // СТОП — замыкание создано

              вернули { tag: "readLine", next: (x) => walk(x) }

        next = { tag: "readLine", next: (x) => walk(x) }

      вернули { tag: "writeLine", text: "Name?",
                next: { tag: "readLine", next: (x) => walk(x) } }

doIO вернул это дерево.
Генератор заморожен на yield readLine.
```

**Состояние в памяти:**

```
program = {
  tag: "writeLine",
  text: "Name?",
  next: {
    tag: "readLine",
    next: (x) => walk(x)    ← gen заморожен здесь
  }
}
```

**Фаза 2 — runIO интерпретирует дерево (side effects):**

```
runIO: current = program

  current.tag = "writeLine"
    → world.writeLine("Name?")     → "Name?" на экране
    → current = current.next       → readLine-узел

  current.tag = "readLine"
    → world.readLine()             → "Alice" (ввод пользователя)
    → current = current.next("Alice")
               = walk("Alice")

      walk("Alice")               // шаг 3: передаём "Alice" в генератор
        gen.next("Alice")
          → name = "Alice"
          → { done: false, value: writeLine("Hi, Alice!") }

        bind( writeLine("Hi, Alice!"), walk )

          case "writeLine":
            → { tag: "writeLine", text: "Hi, Alice!",
                next: bind( pure(undefined), walk ) }

            bind( pure(undefined), walk )
              case "pure":
                → walk(undefined)   // шаг 4: финальный yield

                  gen.next(undefined)
                    → return undefined
                    → { done: true, value: undefined }

                  return pure(undefined)

            next = pure(undefined)

          → { tag: "writeLine", text: "Hi, Alice!",
              next: pure(undefined) }

      walk вернула этот узел.
    current = { tag: "writeLine", text: "Hi, Alice!", next: pure(undefined) }

  current.tag = "writeLine"
    → world.writeLine("Hi, Alice!")    → "Hi, Alice!" на экране
    → current = current.next            → pure(undefined)

  current.tag = "pure"
    → return undefined                  ✓
```

**Вывод на экран:** `Name?` затем `Hi, Alice!`

---

## Часть 10. Генератор как "пульт управления" IO

Хорошая ментальная модель:

```
                    ┌─────────────────────┐
                    │     генератор        │
                    │                      │
                    │  yield writeLine ─►──┼──► IO-дерево
                    │                      │
   "Alice" ◄────────┼─── yield readLine    │
  (от мира)         │         ▲            │
                    │         │            │
                    └─────────┼────────────┘
                              │
                         walk("Alice")
                         передаёт значение
                         обратно в генератор
```

Генератор — это "сценарий программы". Он не знает, откуда берётся "Alice". Он только говорит: "мне нужна строка из мира". `walk` — посредник: берёт IO-инструкцию у генератора, кладёт в дерево через `bind`, а когда интерпретатор её выполнит — возвращает результат обратно.

---

## Часть 11. Почему нужны `as string` касты

Тип `IOGen<A>` — это псевдоним:

```typescript
type IOGen<A> = Generator<
  IO<unknown>,  // T: тип, который yield отдаёт НАРУЖУ (в .value)
  A,            // TReturn: тип финального return
  unknown       // TNext: тип, который gen.next() передаёт ВНУТРЬ
>
```

Третий параметр `unknown` — это тип **результата** каждого yield-выражения. TypeScript не умеет делать его зависимым от конкретного `yield io` — это ограничение языка. Поэтому:

```typescript
const name = (yield readLine) as string
//            ^^^^^^^^^^^^^^
//            TypeScript видит: unknown
//            Мы знаем: это string (результат readLine)
//            Решение: явный каст
```

Каст `as string` — не обман компилятора. Мы точно знаем, что `readLine` вернёт строку. Просто TypeScript не может это вывести автоматически.

В **E8.3** это решается иначе: каждый IO-объект реализует `Symbol.iterator`, который объявляет правильный `TReturn`. Тогда `yield* readLine` возвращает `string` без каста — TypeScript сам это выводит через тип итератора.

---

## Итого: цепочка от genFn до вывода на экран

```
genFn                   — фабрика, создаёт свежий генератор при каждом runIO
  ↓
gen = genFn()           — один генератор, хранит состояние программы

walk()                  — первый шаг (undefined, JS игнорирует)
  ↓
gen.next(undefined)     — генератор идёт до первого yield
  ↓
{ value: someIO }       — какая-то IO-инструкция
  ↓
bind(someIO, walk)      — "выполни это, результат верни в walk"
  ↓
...runIO интерпретирует...
  ↓
walk(worldValue)        — интерпретатор вызывает walk с реальным значением
  ↓
gen.next(worldValue)    — worldValue "залетает" в генератор как значение yield
  ↓
...следующий yield...   — и так по кругу, пока не done: true
  ↓
pure(returnValue)       — программа завершена
```
