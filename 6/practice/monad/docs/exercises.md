# Упражнения: IO-монада от А до Я

> Все упражнения решаются только материалом из главы. Прогрессия: разминка → практика → челлендж.

---

## Разминка

### Упражнение 1: Прочитай дерево

**Сложность:** beginner

**Задание:** Дана Freer-программа, собранная вручную. Не запуская код, определи, что напечатает `runIO` с указанным тестовым миром.

```typescript
import { mkIO, pure, bind, runIO } from "../script";
import { makeTestWorld } from "../script/worlds";

const program = mkIO({
  tag: "impure",
  op: { tag: "writeLine", text: "A" },
  cont: () => mkIO({
    tag: "impure",
    op: { tag: "readLine" },
    cont: (s: string) => mkIO({
      tag: "impure",
      op: { tag: "writeLine", text: s.toUpperCase() },
      cont: () => pure(42),
    }),
  }),
});

const world = makeTestWorld(["hello"], {});
const result = await runIO(program, world);
```

**Вопросы:**
1. Чему равен `world.output` после выполнения?
2. Чему равен `result`?
3. Сколько раз вызывался `world.readLine`?

> [!tip]- Подсказка
> Проследи путь: первый узел — writeLine "A", потом readLine получает "hello", потом writeLine "HELLO", потом pure(42).

> [!warning]- Решение
> 1. `world.output` = `["A", "HELLO"]`
> 2. `result` = `42`
> 3. Один раз

---

### Упражнение 2: bind вручную

**Сложность:** beginner

**Задание:** Не запуская код, вычисли результат следующего выражения. Запиши итоговую структуру (tag, op, cont) на бумаге или в комментарии.

```typescript
const a = writeLine("first");
const b = bind(a, () => writeLine("second"));
const c = bind(b, () => pure(99));
```

**Вопросы:**
1. Каков `c.tag`?
2. Каков `c.op.tag`?
3. Что вернёт `runIO(c, world)`?
4. Что будет в `world.output`?

> [!tip]- Подсказка
> `bind(pure(x), f) = f(x)`. `bind(impure(op, cont), f) = impure(op, resp => bind(cont(resp), f))`. Раскрой по шагам.

> [!warning]- Решение
> 1. `"impure"` (writeLine "first" — первый узел цепочки)
> 2. `"writeLine"` с `text: "first"`
> 3. `99`
> 4. `["first", "second"]`

---

### Упражнение 3: fail и attempt

**Сложность:** beginner

**Задание:** Определи результат без запуска:

```typescript
const world = makeTestWorld([], {});

const p1 = attempt(pure(10));
const r1 = await runIO(p1, world);

const p2 = attempt(fail("boom"));
const r2 = await runIO(p2, world);

const p3 = attempt(bind(writeLine("before"), () => fail("after")));
const r3 = await runIO(p3, world);
```

**Вопросы:**
1. Чему равны `r1`, `r2`, `r3`?
2. Что будет в `world.output` после выполнения всех трёх?

> [!warning]- Решение
> 1. `r1` = `{ ok: true, value: 10 }`, `r2` = `{ ok: false, error: "boom" }`, `r3` = `{ ok: false, error: "after" }`
> 2. `world.output` = `["before"]` — writeLine выполнился до fail

---

## Практика

### Упражнение 4: Собери программу через bind

**Сложность:** intermediate

**Задание:** Напиши программу `echo`, которая:
1. Читает строку
2. Печатает `"You said: <строка>"`
3. Возвращает длину строки

Используй только `bind`, `readLine`, `writeLine`, `pure`. Не используй `doIO`.

**Требования:**
- Тип результата: `Freer<Instr<any>, number>`
- Никаких `as` или `any` в пользовательском коде

**Тесты:**
```typescript
const world = makeTestWorld(["hello"], {});
const result = await runIO(echo, world);
expect(world.output).toEqual(["You said: hello"]);
expect(result).toBe(5);
```

> [!tip]- Подсказка
> `bind(readLine, (s) => bind(writeLine(...), () => pure(s.length)))`

> [!warning]- Решение
> ```typescript
> const echo = bind(readLine, (s) =>
>   bind(writeLine(`You said: ${s}`), () => pure(s.length))
> );
> ```

---

### Упражнение 5: Та же программа через doIO

**Сложность:** intermediate

**Задание:** Перепиши `echo` из упражнения 4 через `doIO` с `yield*`. Тесты должны дать ровно тот же результат.

```typescript
const echoDoIO = doIO(function* () {
  // ...
});
```

**Тесты:**
```typescript
const w1 = makeTestWorld(["hello"], {});
const w2 = makeTestWorld(["hello"], {});
const r1 = await runIO(echo, w1);
const r2 = await runIO(echoDoIO, w2);
expect(w1.output).toEqual(w2.output);
expect(r1).toBe(r2);
```

> [!warning]- Решение
> ```typescript
> const echoDoIO = doIO(function* () {
>   const s = yield* readLine;
>   yield* writeLine(`You said: ${s}`);
>   return s.length;
> });
> ```

---

### Упражнение 6: orElse с fallback

**Сложность:** intermediate

**Задание:** Напиши программу `safeFetch`, которая:
1. Печатает `"Fetching..."`
2. Пытается сделать `fetchUrl(url)`
3. Если fetch упал — печатает `"Failed: <ошибка>"` и возвращает `"default"`
4. Если fetch успешен — возвращает тело ответа

Используй `doIO`, `attempt` или `orElse`.

**Тесты:**
```typescript
// Успешный fetch
const w1 = makeTestWorld([], { "https://api.test": "data" });
const r1 = await runIO(safeFetch("https://api.test"), w1);
expect(r1).toBe("data");
expect(w1.output).toEqual(["Fetching..."]);

// Неудачный fetch (URL не замокан — упадёт)
const w2 = makeTestWorld([], {});
const r2 = await runIO(safeFetch("https://missing.test"), w2);
expect(r2).toBe("default");
expect(w2.output[0]).toBe("Fetching...");
expect(w2.output[1]).toMatch(/Failed:/);
```

> [!tip]- Подсказка
> `orElse(fetchUrl(url), (e) => bind(writeLine(...), () => pure("default")))`

> [!warning]- Решение
> ```typescript
> const safeFetch = (url: string) => doIO(function* () {
>   yield* writeLine("Fetching...");
>   const result = yield* attempt(fetchUrl(url));
>   if (result.ok) return result.value;
>   yield* writeLine(`Failed: ${result.error}`);
>   return "default";
> });
> ```

---

### Упражнение 7: sequence

**Сложность:** intermediate

**Задание:** Используя `sequence` (или напиши свою), создай программу, которая принимает массив URL и возвращает массив тел ответов.

```typescript
const fetchAll = (urls: string[]): Freer<Instr<any>, string[]> => // ...
```

**Тесты:**
```typescript
const world = makeTestWorld([], {
  "https://a.test": "body-a",
  "https://b.test": "body-b",
  "https://c.test": "body-c",
});
const result = await runIO(
  fetchAll(["https://a.test", "https://b.test", "https://c.test"]),
  world,
);
expect(result).toEqual(["body-a", "body-b", "body-c"]);
```

> [!tip]- Подсказка
> `sequence(urls.map(url => bind(fetchUrl(url), pure)))`
> Или проще: `sequence(urls.map(fetchUrl))`

> [!warning]- Решение
> ```typescript
> const fetchAll = (urls: string[]) => sequence(urls.map(fetchUrl));
> ```

---

## Челлендж

### Упражнение 8: Напиши свой интерпретатор

**Сложность:** advanced

**Задание:** Напиши `runIODry` — интерпретатор, который **не выполняет** эффектов, а собирает лог того, что *было бы* сделано. Для `readLine` используй заданные ответы (как в тестовом мире), для `writeLine` записывай текст, для `fetch` записывай URL.

```typescript
type LogEntry =
  | { type: "read"; value: string }
  | { type: "write"; text: string }
  | { type: "fetch"; url: string };

const runIODry = async <A>(
  io: Freer<Instr<any>, A>,
  inputs: string[],
  fetchMock: Record<string, string>,
): Promise<{ result: A; log: LogEntry[] }> => {
  // ...
};
```

**Требования:**
- Не вызывать `console.log`, `fetch`, `prompt` или любые реальные эффекты
- Лог должен содержать записи в порядке выполнения
- При исчерпании inputs — бросить ошибку (fail loud)
- При незамоканном URL — бросить ошибку

**Тесты:**
```typescript
const program = doIO(function* () {
  yield* writeLine("Name?");
  const name = yield* readLine;
  const body = yield* fetchUrl("https://api.test");
  yield* writeLine(`${name}: ${body}`);
  return name;
});

const { result, log } = await runIODry(
  program,
  ["Alice"],
  { "https://api.test": "data" },
);

expect(result).toBe("Alice");
expect(log).toEqual([
  { type: "write", text: "Name?" },
  { type: "read", value: "Alice" },
  { type: "fetch", url: "https://api.test" },
  { type: "write", text: "Alice: data" },
]);
```

> [!tip]- Подсказка 1
> Структура та же, что у `runIO`: цикл `while(true)` с switch по `current.tag`, потом по `current.op.tag`. Вместо вызова `world.*` — push в массив `log`.

> [!tip]- Подсказка 2
> Для `readLine`: `const value = inputs.shift()`, запиши `{ type: "read", value }` в лог, передай `value` в `cont`.

> [!warning]- Решение
> ```typescript
> const runIODry = async <A>(
>   io: Freer<Instr<any>, A>,
>   inputs: string[],
>   fetchMock: Record<string, string>,
> ): Promise<{ result: A; log: LogEntry[] }> => {
>   const log: LogEntry[] = [];
>   const strs = [...inputs];
>   let current: Freer<Instr<any>, any> = io;
>
>   while (true) {
>     switch (current.tag) {
>       case "pure":
>         return { result: current.value, log };
>       case "impure":
>         switch (current.op.tag) {
>           case "writeLine":
>             log.push({ type: "write", text: current.op.text });
>             current = current.cont(undefined);
>             break;
>           case "readLine": {
>             const value = strs.shift();
>             if (value === undefined) throw new Error("No more inputs");
>             log.push({ type: "read", value });
>             current = current.cont(value);
>             break;
>           }
>           case "fetch": {
>             const url = current.op.url;
>             if (!(url in fetchMock)) throw new Error(`Not mocked: ${url}`);
>             log.push({ type: "fetch", url });
>             current = current.cont(fetchMock[url]);
>             break;
>           }
>           case "fail":
>             throw current.op.error;
>         }
>     }
>   }
> };
> ```

---

### Упражнение 9: loggingWorld как декоратор

**Сложность:** advanced

**Задание:** `loggingWorld(inner)` уже реализован в проекте. Напиши аналогичный `countingWorld(inner)` — декоратор, который считает количество вызовов каждого эффекта.

```typescript
const countingWorld = (inner: World): World & { counts: Record<string, number> } => {
  // ...
};
```

**Тесты:**
```typescript
const inner = makeTestWorld(["Alice"], { "https://api.test": "body" });
const counted = countingWorld(inner);

await runIO(doIO(function* () {
  yield* writeLine("Name?");
  const name = yield* readLine;
  yield* writeLine(`Hi, ${name}!`);
  yield* fetchUrl("https://api.test");
}), counted);

expect(counted.counts).toEqual({
  readLine: 1,
  writeLine: 2,
  fetch: 1,
});
```

> [!warning]- Решение
> ```typescript
> const countingWorld = (inner: World): World & { counts: Record<string, number> } => {
>   const counts: Record<string, number> = { readLine: 0, writeLine: 0, fetch: 0 };
>   return {
>     counts,
>     readLine: async () => {
>       counts.readLine++;
>       return inner.readLine();
>     },
>     writeLine: async (s) => {
>       counts.writeLine++;
>       return inner.writeLine(s);
>     },
>     fetch: async (url, opts) => {
>       counts.fetch++;
>       return inner.fetch(url, opts);
>     },
>   };
> };
> ```

---

### Упражнение 10: Добавь новый эффект Sleep

**Сложность:** advanced

**Задание:** Добавь инструкцию `Sleep` в Freer-систему, не трогая `bind`. Шаги:

1. Добавь тип `TSleep` в `types.ts` (с `_resp: void`)
2. Добавь `TSleep` в объединение `Instr`
3. Напиши smart constructor `sleep(ms: number)`
4. Добавь ветку в `runIO`
5. Добавь мок в `makeTestWorld` (мгновенный, без реальной задержки)

**Требования:**
- `bind` не трогается вообще
- `sleep(1000)` в тестовом мире выполняется мгновенно
- В production world `sleep` делает реальный `setTimeout`

**Тесты:**
```typescript
const program = doIO(function* () {
  yield* writeLine("Starting...");
  yield* sleep(1000);
  yield* writeLine("Done!");
});

const world = makeTestWorld([""], {});
const start = Date.now();
await runIO(program, world);
expect(Date.now() - start).toBeLessThan(50); // мгновенно
expect(world.output).toEqual(["Starting...", "Done!"]);
```

> [!tip]- Подсказка
> `TSleep = { _resp: void; tag: "sleep"; ms: number }`. В тестовом мире sleep — no-op. В production: `await new Promise(r => setTimeout(r, ms))`.

> [!warning]- Решение
> ```typescript
> // types.ts
> export type TSleep = { _resp: void; tag: "sleep"; ms: number };
> export type Instr<R> = TFail | TFetch<R> | TReadLine | TSleep | TWriteLine;
>
> // index.ts
> export const sleep = (ms: number): Freer<TSleep, void> => mkIO({
>   tag: "impure",
>   op: { tag: "sleep", ms } as TSleep,
>   cont: () => pure(undefined),
> });
>
> // В runIO, внутри case "impure":
> case "sleep":
>   await world.sleep(current.op.ms);
>   current = current.cont(undefined);
>   break;
>
> // В World:
> sleep: (ms: number) => Promise<void>;
>
> // В makeTestWorld:
> sleep: async () => {},  // мгновенно
> ```
