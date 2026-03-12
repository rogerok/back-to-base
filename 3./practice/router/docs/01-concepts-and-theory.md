# Роутер: Концепции и теория

> Этот учебник объясняет **что** и **зачем**, без готового кода.
> Цель — сформировать ментальную модель, чтобы ты мог реализовать всё сам.

---

## Оглавление

- [1. Общая архитектура роутера](#1-общая-архитектура-роутера)
  - [1.1 Что такое роутер](#11-что-такое-роутер)
  - [1.2 Из каких частей состоит](#12-из-каких-частей-состоит)
  - [1.3 Жизненный цикл запроса](#13-жизненный-цикл-запроса)
- [2. Middleware: от Express к Koa](#2-middleware-от-express-к-koa)
  - [2.1 Express-стиль (линейная цепочка)](#21-express-стиль-линейная-цепочка)
  - [2.2 Koa-стиль (onion model)](#22-koa-стиль-onion-model)
  - [2.3 Функция compose](#23-функция-compose)
  - [2.4 Async/await и промисы в middleware](#24-asyncawait-и-промисы-в-middleware)
- [3. Контекстный подход (Context)](#3-контекстный-подход-context)
  - [3.1 Зачем Context вместо (req, res)](#31-зачем-context-вместо-req-res)
  - [3.2 Расширение Context через declaration merging](#32-расширение-context-через-declaration-merging)
  - [3.3 Изоляция контекста между запросами](#33-изоляция-контекста-между-запросами)
- [4. Radix Tree (сжатый префиксный trie)](#4-radix-tree-сжатый-префиксный-trie)
  - [4.1 Зачем дерево, а не массив](#41-зачем-дерево-а-не-массив)
  - [4.2 Trie vs Radix Tree](#42-trie-vs-radix-tree)
  - [4.3 Операция insert](#43-операция-insert)
  - [4.4 Операция search](#44-операция-search)
  - [4.5 Сплит нод (split)](#45-сплит-нод-split)
  - [4.6 Типы нод: Static, Parametric, Wildcard](#46-типы-нод-static-parametric-wildcard)
  - [4.7 Приоритет: Static > Parametric > Wildcard](#47-приоритет-static--parametric--wildcard)
- [5. Nesting (вложенные роуты)](#5-nesting-вложенные-роуты)
  - [5.1 Концепция nest()](#51-концепция-nest)
  - [5.2 Скоупинг middleware при nesting](#52-скоупинг-middleware-при-nesting)
  - [5.3 Два подхода к реализации](#53-два-подхода-к-реализации)
- [6. HTTP-методы как middleware](#6-http-методы-как-middleware)
  - [6.1 Принцип "всё есть middleware"](#61-принцип-всё-есть-middleware)
  - [6.2 Как .get() работает на практике](#62-как-get-работает-на-практике)
  - [6.3 Порядок регистрации определяет middleware-цепочку](#63-порядок-регистрации-определяет-middleware-цепочку)
- [7. Zod-валидация](#7-zod-валидация)
  - [7.1 Зачем валидация на уровне роутера](#71-зачем-валидация-на-уровне-роутера)
  - [7.2 Что валидируем: body, params, query, response](#72-что-валидируем-body-params-query-response)
  - [7.3 Валидация как middleware](#73-валидация-как-middleware)
- [8. Типизированные ответы](#8-типизированные-ответы)
  - [8.1 StatusBodyMap — маппинг статус-кода на тип тела](#81-statusbodymap--маппинг-статус-кода-на-тип-тела)
  - [8.2 Как TypeScript помогает через conditional types](#82-как-typescript-помогает-через-conditional-types)
- [9. Builder Pattern и Fluent API](#9-builder-pattern-и-fluent-api)
  - [9.1 Возврат this для chaining](#91-возврат-this-для-chaining)
- [10. Как устроен find-my-way: детальный разбор](#10-как-устроен-find-my-way-детальный-разбор)
  - [10.1 Архитектура: отдельное дерево на каждый HTTP-метод](#101-архитектура-отдельное-дерево-на-каждый-http-метод)
  - [10.2 Node: три типа узлов](#102-node-три-типа-узлов)
  - [10.3 createStaticChild() и split()](#103-createstaticchild-и-split)
  - [10.4 _on(): как регистрируется маршрут](#104-_on-как-регистрируется-маршрут)
  - [10.5 find(): как ищется маршрут](#105-find-как-ищется-маршрут)
  - [10.6 getNextNode() и backtracking](#106-getnextnode-и-backtracking)
  - [10.7 HandlerStorage](#107-handlerstorage)
  - [10.8 Что взять из find-my-way, а что упростить](#108-что-взять-из-find-my-way-а-что-упростить)

---

## 1. Общая архитектура роутера

### 1.1 Что такое роутер

Роутер — это диспетчер запросов. На вход приходит HTTP-запрос (метод + URL), на выходе — вызов нужного обработчика с правильными параметрами.

Схема работы при обработке запроса:
```
HTTP запрос (GET /api/users/42)
    │
    ▼
┌─────────────────────┐
│   Route matching    │  ← Radix Tree: /api/users/:id → composed handler
│   (radix tree)      │     (middleware уже внутри!)
└─────────┬───────────┘
          │
          ▼
┌─────────────────────────────────────┐
│   Composed handler (onion model)    │
│                                     │
│   logger → auth → validate → handler│
│   (всё скомпоновано при регистрации)│
└─────────────────────────────────────┘
```

Схема регистрации маршрута:
```
router.use(logger).use(auth).get("/users/:id", { schema }, handler)
    │
    ▼
snapshot middleware: [logger, auth]
    │
    ▼
compose([logger, auth, zodValidation, handler]) → одна функция
    │
    ▼
tree.insert("GET", "/users/:id", composedFunction)
```

### 1.2 Из каких частей состоит

Роутер — это комбинация нескольких независимых компонентов:

| Компонент | Ответственность |
|-----------|-----------------|
| **Router** | Координация: регистрация маршрутов, запуск middleware-цепочки |
| **RouteTree** (Radix Tree) | Хранение и поиск маршрутов по URL |
| **Node** | Узел дерева (static, parametric, wildcard) |
| **HandlerStorage** | Хранение обработчиков по HTTP-методам для узла |
| **compose()** | Сборка middleware в единую цепочку (onion) |
| **Context** | Контейнер для данных запроса/ответа |

### 1.3 Жизненный цикл запроса

Роутер работает в **два этапа**: регистрация (при старте) и обработка (при запросе).

**Этап 1 — Регистрация** (при вызовах `.use()`, `.get()`, `.nest()`):

При каждом `.get(path, handler)` роутер:
1. Делает **snapshot** текущих middleware (те что зарегистрированы через `.use()` к этому моменту)
2. Собирает стек: `[...snapshot, (validation middleware если есть schema), handler]`
3. Оборачивает стек в **compose** → получается одна функция
4. Вставляет эту composed-функцию в **Radix Tree** по path + method

**Этап 2 — Обработка** (при вызове `router.handle(req, res)`):

1. Парсится URL: отделяется path от query string
2. Ищется маршрут в дереве: `tree.search(method, path)` → composed handler + params
3. Если маршрут не найден → return
4. Создаётся **Context** `{ req: { ...req, params, query }, res }`
5. Вызывается composed handler: `await handler(ctx)` — middleware уже внутри!

Каждая middleware в composed-цепочке может:
- Обогатить контекст (добавить поля)
- Вызвать `next()` для передачи управления дальше
- Остановить цепочку (не вызвав `next()`)
- Выполнить код **после** `await next()` (onion-модель)

---

## 2. Middleware: от Express к Koa

### 2.1 Express-стиль (линейная цепочка)

Это то, что ты уже реализовал в первом задании:

```
mw1 → mw2 → mw3 → handler
```

Каждая middleware вызывает `next()` чтобы передать управление следующей. Это **линейный** поток — управление идёт только в одну сторону.

**Проблема**: `next()` не возвращает Promise, поэтому `await next()` бессмысленно — нельзя дождаться завершения всех нижестоящих async-middleware. Код после `next()` выполнится сразу, не дожидаясь handler'а.

### 2.2 Koa-стиль (onion model)

```
mw1-in → mw2-in → handler → mw2-out → mw1-out
```

Визуализация "луковицы":

```
┌───────────────────────────────┐
│  middleware 1                 │
│  ┌───────────────────────┐   │
│  │  middleware 2          │   │
│  │  ┌─────────────┐      │   │
│  │  │   handler    │      │   │
│  │  └─────────────┘      │   │
│  └───────────────────────┘   │
└───────────────────────────────┘
```

**Ключевая идея**: `next()` возвращает Promise. Когда ты делаешь `await next()`, код после этой строки выполнится когда ВСЕ нижестоящие middleware и handler завершатся.

```
async (ctx, next) => {
  console.log("IN");    // 1. Вход
  await next();          // 2. Ждём пока все нижестоящие отработают
  console.log("OUT");   // 3. Выход — выполнится после handler'а
}
```

**Это позволяет**:
- Замерить время обработки (записал время ДО next, после next — вычислил разницу)
- Перехватить ошибки (try/catch вокруг await next())
- Модифицировать ответ после handler'а

### 2.3 Функция compose

`compose` — это сердце middleware-системы. Она превращает массив middleware в одну функцию.

**Концептуально** compose делает следующее:
- Принимает массив `[mw1, mw2, mw3, handler]`
- Возвращает функцию `(ctx, finalNext) => ...`
- Внутри создаёт функцию `dispatch(i)` которая:
  - Берёт middleware по индексу `i`
  - Вызывает её, передавая `ctx` и `() => dispatch(i + 1)` как `next`
  - Каждая middleware решает, вызвать ли `next()` (т.е. `dispatch(i+1)`)

**Важные моменты**:
- `dispatch` возвращает Promise — это обеспечивает onion-модель
- Если `next()` вызвана дважды — это ошибка (нужна защита через `index`)
- Если middleware не вызвала `next()` — цепочка останавливается

> Посмотри реализацию compose в [koa-compose](https://github.com/koajs/compose/blob/master/index.js) — это всего ~25 строк кода, но понять их критически важно.

### 2.4 Async/await и промисы в middleware

Middleware может быть:
- **Синхронной**: `(ctx, next) => { next(); }`
- **Асинхронной**: `async (ctx, next) => { await next(); }`

Чтобы поддержать оба варианта, `dispatch` всегда оборачивает результат в `Promise.resolve()`:
```
Promise.resolve(middleware(ctx, nextFn))
```

Это гарантирует, что даже синхронная middleware вернёт Promise.

---

## 3. Контекстный подход (Context)

> **Заметка про тесты**: в тестах ментора интерфейс называется `Context2` (а не `Context`),
> чтобы не конфликтовать с другими реализациями в проекте. Когда будешь делать свою реализацию,
> можешь назвать его `Context` — только не забудь поправить импорты/ссылки в тестах, или
> наоборот, назови свой интерфейс `Context2` чтобы тесты работали без изменений.

### 3.1 Зачем Context вместо (req, res)

В первом задании signature был `(req, res, next)`. Теперь — `(ctx, next)`.

**Преимущества Context**:
1. **Единая точка расширения** — middleware может добавить в ctx любые поля (`ctx.userId`, `ctx.dataSource`)
2. **Изоляция** — каждый запрос получает свой экземпляр Context
3. **Типобезопасность** — через declaration merging можно типизировать расширения

### 3.2 Расширение Context через declaration merging

TypeScript позволяет "склеивать" несколько объявлений одного интерфейса:

```typescript
// в основном файле
interface Context {
  req: Request;
  res: Response;
}

// в db-middleware.d.ts — расширяем через declaration merging
declare global {
  interface Context {
    dataSource: DbInstance;  // добавляется к существующему Context
  }
}
```

Теперь `Context` имеет все три поля. Это работает потому что TypeScript объединяет все `interface` с одинаковым именем в одной области видимости.

**Зачем `declare global`?** Если интерфейс объявлен в глобальном scope (не в модуле), расширения тоже должны быть глобальными. Если Context — в модуле, используй module augmentation.

### 3.3 Изоляция контекста между запросами

**Критично**: каждый вызов `handle()` должен создавать **новый** объект Context. Иначе параллельные запросы будут портить данные друг другу.

```
// ПРАВИЛЬНО — новый объект на каждый handle()
handle(req, res) {
  const ctx = { req, res, params: {} };  // новый объект
  ...
}

// НЕПРАВИЛЬНО — общий объект
this.ctx.req = req;  // два параллельных запроса перезапишут друг друга
```

---

## 4. Radix Tree (сжатый префиксный trie)

### 4.1 Зачем дерево, а не массив

Наивный подход — хранить маршруты в массиве и итерировать по ним:
```
routes = ["/users", "/users/:id", "/users/:id/posts", "/api/test"]
```

**Проблемы массива**:
- Поиск O(n) — нужно пройти все маршруты
- Нет sharing общих префиксов — `/users` дублируется

**Radix Tree даёт**:
- Поиск O(k) где k — длина URL (не зависит от количества маршрутов!)
- Общие префиксы хранятся один раз

### 4.2 Trie vs Radix Tree

**Trie** (префиксное дерево) — каждый узел хранит один символ:

```
root
 └─ u
    └─ s
       └─ e
          └─ r
             └─ s  [handler: GET /users]
                └─ /
                   └─ :id  [handler: GET /users/:id]
```

**Radix Tree** (сжатый trie) — узлы со одним потомком сливаются:

```
root
 └─ "users"  [handler: GET /users]
    └─ /
       └─ :id  [handler: GET /users/:id]
```

Radix Tree сжимает цепочки узлов с единственным потомком в один узел с более длинной строкой.

### 4.3 Операция insert

Вставка `/test` а затем `/testing`:

**Шаг 1**: Вставляем `/test`
```
root
 └─ "test" [GET handler]
```

**Шаг 2**: Вставляем `/testing` — у "test" и "testing" общий префикс "test"
```
root
 └─ "test" [GET handler]     ← "test" уже есть
     └─ "ing" [GET handler]  ← остаток "ing" — новый потомок
```

Обрати внимание: узел "test" **сохранил** свой handler. Это не split, а просто добавление потомка.

**Шаг 3**: Вставляем `/tea` — общий префикс с "test" — "te"
```
root
 └─ "te"                    ← split! "test" стал "te" + "st"
     ├─ "st" [GET handler]  ← старый handler перешёл сюда
     │   └─ "ing" [GET]
     └─ "a" [GET handler]   ← новый маршрут
```

### 4.4 Операция search

Поиск `/testing`:

1. Начинаем с root
2. Ищем потомка, чей path — префикс "/testing" → находим "te"
3. Остаток: "sting". Ищем потомка "te", чей path — префикс "sting" → находим "st"
4. Остаток: "ing". Ищем потомка "st", чей path — префикс "ing" → находим "ing"
5. Остаток: "". Пустой — мы на конечном узле. Возвращаем handler.

### 4.5 Сплит нод (split)

Split — ключевая операция radix tree. Она нужна когда при вставке обнаруживается, что общий префикс **короче** существующего узла.

**До split**: узел "test" с handler'ом и потомками

**После split "test" на позиции 2 ("te")**:
1. Создаём новый узел "st" (остаток после префикса)
2. Переносим handler и потомков из "test" в "st"
3. Меняем path "test" на "te"
4. Очищаем handler "te", делаем "st" его потомком

### 4.6 Типы нод: Static, Parametric, Wildcard

| Тип | Пример | Описание |
|-----|--------|----------|
| **Static** | `"users"`, `"api"` | Точное совпадение строки |
| **Parametric** | `:id`, `:userId` | Захватывает один сегмент URL (до следующего `/`) |
| **Wildcard** | `*` | Захватывает всё оставшееся |

В дереве параметрические и wildcard ноды — отдельные потомки:

```
root
 └─ "users"
     ├─ "/me"     [Static — приоритет выше!]
     └─ /:id      [Parametric]
```

### 4.7 Приоритет: Static > Parametric > Wildcard

При поиске, если URL `/users/me` совпадает и со static `/users/me` и с parametric `/users/:id`, побеждает **static**.

Это достигается порядком обхода потомков при поиске:
1. Сначала проверяем Static потомков
2. Потом Parametric
3. Потом Wildcard

> **В find-my-way** это реализовано в файле `index.js`, функция `_find()`. Посмотри как они сортируют children по типу.

---

## 5. Nesting (вложенные роуты)

### 5.1 Концепция nest()

```typescript
const router = new Router()
  .use(logger)
  .nest("/api", (r) => r
    .use(auth)
    .get("/users", handler)
  );
```

`nest("/api", callback)` создаёт **scope**: все маршруты внутри callback получают префикс `/api`.

### 5.2 Скоупинг middleware при nesting

**Ключевое правило**: middleware, зарегистрированная на уровне parent, применяется к вложенным маршрутам. Middleware вложенного scope **не утекает** наружу.

```
router
  .use(logger)              ← применяется ко ВСЕМ маршрутам
  .nest("/api", r => r
    .use(auth)              ← применяется только к /api/* маршрутам
    .get("/users", handler) ← цепочка: logger → auth → handler
  )
  .get("/health", handler)  ← цепочка: logger → handler (БЕЗ auth!)
```

Это значит, что при регистрации маршрута нужно запоминать, какие middleware были в стеке **на момент регистрации**.

### 5.3 Два подхода к реализации

**Подход 1: Копирование middleware-стека при регистрации**

При вызове `addRoute()` копируем текущий массив middleware:
```
route.stack = [...currentMiddlewares, handler]
```

Плюс: просто. Минус: дублирование памяти.

**Подход 2: Дочерний роутер**

`nest()` создаёт новый Router, который при `handle()` проверяет prefix и делегирует вложенному.

Плюс: чище архитектурно. Минус: нужно аккуратно пробрасывать parent middleware.

> Тесты от ментора проверяют оба аспекта: что parent middleware работает для nested, и что nested middleware НЕ работает для parent.

---

## 6. HTTP-методы как middleware

### 6.1 Принцип "всё есть middleware"

Из задания: *"все методы роутера могут быть выражены через use"*.

Это значит, что handler маршрута — это просто **последняя middleware** в цепочке. Когда ты вызываешь `.get("/users", handler)`, внутри роутер:
1. Берёт snapshot текущих middleware
2. Добавляет handler в конец
3. Compose'ит всё в одну функцию
4. Сохраняет в radix tree

Концептуально handler ничем не отличается от middleware — у него тот же signature `(ctx, next)`.

### 6.2 Как .get() работает на практике

На уровне реализации `.get()` **не** превращается в `.use()` напрямую. Вместо этого:

```
router.get("/users", handler)
→ snapshot = [...currentMiddleware]
→ composed = compose([...snapshot, handler])
→ tree.insert("GET", "/users", composed)
```

А при `handle(req, res)`:
```
result = tree.search("GET", "/users")
→ result.handler(ctx)  // это уже composed функция со всеми middleware внутри
```

Radix Tree хранит уже готовые скомпонованные обработчики — поиск по дереву + один вызов.

### 6.3 Порядок регистрации определяет middleware-цепочку

**Критический тест** из файла тестов:

```typescript
const router = new Router()
  .get("/first", handler1)   // БЕЗ middleware (зарегистрирован до .use())
  .use(loggerMiddleware)      // применяется только к маршрутам ПОСЛЕ неё
  .get("/second", handler2);  // С middleware
```

`GET /first` → handler1 (без logger)
`GET /second` → logger → handler2

Это значит, что при вызове `.get()` нужно "снять snapshot" текущих middleware.

---

## 7. Zod-валидация

### 7.1 Зачем валидация на уровне роутера

Вместо ручной проверки в каждом handler'е:
```typescript
// Плохо — дублирование
router.post("/users", (ctx) => {
  if (!ctx.req.body.name) return ctx.res.status(400).send({...});
  ...
});
```

Валидация объявляется декларативно:
```typescript
router.post("/users", {
  schema: { body: z.object({ name: z.string() }) }
}, handler);
```

### 7.2 Что валидируем: body, params, query, response

| Что | Когда | Что делать при ошибке |
|-----|-------|-----------------------|
| **body** | До handler'а | `res.status(400)` |
| **params** | До handler'а (после парсинга URL) | `res.status(400)` |
| **query** | До handler'а | `res.status(400)` |
| **response** | После handler'а | throw Error (баг в коде) |

### 7.3 Валидация как middleware

Валидация идеально вписывается в middleware-модель:

```
[...parentMiddleware, validationMiddleware, handler]
```

`validationMiddleware` — автоматически генерируется на основе переданной schema. Если валидация провалилась — отвечает 400 и не вызывает `next()`.

Для **response** валидации нужно перехватить вызов `res.status().send()`. Это можно сделать через Proxy или обёртку.

---

## 8. Типизированные ответы

### 8.1 StatusBodyMap — маппинг статус-кода на тип тела

```typescript
interface StatusBodyMap {
  200: T;           // T — generic, определяется schema
  201: unknown;
  204: never;       // 204 No Content — тела нет
  400: { error: string };
  500: { error: string };
}
```

Это позволяет TypeScript проверять, что `res.status(400).send({...})` содержит поле `error`.

### 8.2 Как TypeScript помогает через conditional types

```typescript
interface TypedResponse {
  status<S extends StatusCode>(code: S): {
    send(body: StatusBodyMap[S]): void;  // тип body зависит от S
  };
}
```

Когда ты пишешь `ctx.res.status(200)`, TypeScript подставляет S=200, и `send()` ожидает тип `StatusBodyMap[200]`.

---

## 9. Builder Pattern и Fluent API

### 9.1 Возврат this для chaining

Каждый метод роутера возвращает `this`:

```typescript
get(path, handler): this {
  // ...регистрация...
  return this;
}
```

Это позволяет:
```typescript
new Router()
  .use(logger)
  .get("/", handler)
  .post("/users", createUser);
```

**Важно**: тип возвращаемого значения — `this`, а не `Router`. Это позволяет наследникам сохранять свой тип.

---

## 10. Как устроен find-my-way: детальный разбор

> Репозиторий: https://github.com/delvedor/find-my-way
> Это production-библиотека для Node.js (используется в Fastify).
> Твой роутер вдохновлён ей — ниже разбор ключевых решений из исходного кода.

### 10.1 Архитектура: отдельное дерево на каждый HTTP-метод

В find-my-way **нет одного общего дерева**. Вместо этого — объект `this.trees`:

```javascript
// При регистрации маршрута:
if (this.trees[method] === undefined) {
  this.trees[method] = new StaticNode('/')
}
```

То есть GET-маршруты живут в одном дереве, POST — в другом, и т.д.

**Для твоей реализации**: ты можешь пойти тем же путём (проще!) или хранить все маршруты в одном дереве, а HTTP-метод проверять в `HandlerStorage` (Map<Method, Handler> на каждом узле). Второй подход компактнее, но чуть сложнее.

### 10.2 Node: три типа узлов

```javascript
const NODE_TYPES = {
  STATIC: 0,      // точное совпадение строки
  PARAMETRIC: 1,  // :id, :userId — захватывает сегмент
  WILDCARD: 2     // * — захватывает всё оставшееся
}
```

Структура `StaticNode`:

```javascript
class StaticNode extends Node {
  prefix           // строка этого узла ("users", "api/v1", и т.д.)
  staticChildren   // Object: { первый_символ: StaticNode }
  parametricChildren  // Array<ParametricNode> — отсортированы по приоритету
  wildcardChild    // WildcardNode | null
}
```

**Ключевое решение**: static-потомки хранятся в **объекте** (не массиве!) по первому символу:
```javascript
this.staticChildren[path.charAt(0)] = new StaticNode(path)
```

Это даёт O(1) lookup вместо перебора массива. Для простоты ты можешь использовать массив — на малом количестве маршрутов разницы нет.

### 10.3 createStaticChild() и split()

Это **самая важная** часть для понимания. Вот реальный код:

```javascript
createStaticChild(path) {
  if (path.length === 0) return this;

  let staticChild = this.staticChildren[path.charAt(0)];

  if (staticChild) {
    // Нашли потомка с таким же первым символом
    // Ищем длину общего префикса
    let i = 1;
    for (; i < staticChild.prefix.length; i++) {
      if (path.charCodeAt(i) !== staticChild.prefix.charCodeAt(i)) {
        // Несовпадение! Нужен split
        staticChild = staticChild.split(this, i);
        break;
      }
    }
    // Рекурсия с остатком пути
    return staticChild.createStaticChild(path.slice(i));
  }

  // Потомка нет — создаём новый
  this.staticChildren[path.charAt(0)] = new StaticNode(path);
  return this.staticChildren[path.charAt(0)];
}
```

А вот `split()`:

```javascript
split(parentNode, length) {
  const parentPrefix = this.prefix.slice(0, length);   // общий префикс
  const childPrefix = this.prefix.slice(length);        // остаток

  this.prefix = childPrefix;  // текущий узел становится "остатком"

  const staticNode = new StaticNode(parentPrefix);  // новый узел для префикса
  staticNode.staticChildren[childPrefix.charAt(0)] = this;  // старый узел — потомок
  parentNode.staticChildren[parentPrefix.charAt(0)] = staticNode;  // заменяем в родителе

  return staticNode;
}
```

**Пример**. Дерево: `root → "testing"`. Вставляем `"team"`:

1. `createStaticChild("team")` на root
2. Находим потомка по `"t"` → `"testing"`
3. Сравниваем: `t=t, e=e, a≠s` → split на позиции 2
4. Split: `"testing"` → `"te"` (новый) + `"sting"` (старый обрезанный)
5. Рекурсия: `"te".createStaticChild("am")` → новый потомок `"am"`

Результат:
```
root → "te"
        ├── "sting" [handlers от "testing"]
        └── "am"    [handlers от "team"]
```

### 10.4 _on(): как регистрируется маршрут

Метод `_on()` обходит путь **посимвольно** и строит дерево:

```javascript
// Упрощённая логика _on():
for (let i = 0; i <= pattern.length; i++) {
  const isParametric = pattern[i] === ':';
  const isWildcard = pattern[i] === '*';

  if (isParametric || isWildcard || i === pattern.length) {
    // 1. Всё что накопилось до спец.символа — static-часть
    let staticPart = pattern.slice(lastIndex, i);
    currentNode = currentNode.createStaticChild(staticPart);

    if (isParametric) {
      // 2. Извлекаем имя параметра, опциональный regex
      // 3. currentNode = currentNode.createParametricChild(...)
    }
    if (isWildcard) {
      // 4. currentNode = currentNode.createWildcardChild()
    }
  }
}
// 5. В конце: currentNode.addRoute(route)
```

**Ключевой паттерн**: путь разбивается на чередование static и parametric/wildcard сегментов. Static-часть создаётся через `createStaticChild` (который делает split при необходимости), а parametric/wildcard — через отдельные методы.

### 10.5 find(): как ищется маршрут

`find()` — итеративный (не рекурсивный!) обход дерева с backtracking:

```javascript
find(method, path) {
  let currentNode = this.trees[method];  // корень дерева для метода
  let pathIndex = currentNode.prefix.length;
  const brothersNodesStack = [];  // стек для backtracking!

  while (true) {
    // Конец пути + узел-лист → нашли!
    if (pathIndex === pathLen && currentNode.isLeafNode) {
      const handle = currentNode.handlerStorage.getMatchingHandler(...);
      if (handle) return { handler, params, ... };
    }

    // Получаем следующий узел (static → parametric → wildcard)
    let node = currentNode.getNextNode(path, pathIndex, brothersNodesStack, ...);

    if (node === null) {
      // Тупик! Backtrack
      if (brothersNodesStack.length === 0) return null;
      const state = brothersNodesStack.pop();
      pathIndex = state.brotherPathIndex;  // откатываем позицию
      params.splice(state.paramsCount);    // откатываем параметры
      node = state.brotherNode;            // пробуем альтернативу
    }

    currentNode = node;

    if (currentNode.kind === STATIC) {
      pathIndex += currentNode.prefix.length;  // просто двигаем индекс
    }
    if (currentNode.kind === PARAMETRIC) {
      // Извлекаем значение параметра до следующего "/"
      params.push(paramValue);
      pathIndex = paramEndIndex;
    }
    if (currentNode.kind === WILDCARD) {
      params.push(всё_остальное);
      pathIndex = pathLen;
    }
  }
}
```

**Почему итеративный, а не рекурсивный?** Производительность. Нет overhead'а на стек вызовов. Backtracking реализован через явный стек `brothersNodesStack`.

### 10.6 getNextNode() и backtracking

```javascript
getNextNode(path, pathIndex, nodeStack, paramsCount) {
  // 1. Пробуем static (приоритет!)
  let node = this.findStaticMatchingChild(path, pathIndex);

  // 2. Если static не нашёлся — берём первый parametric
  if (node === null) {
    if (this.parametricChildren.length === 0) return this.wildcardChild;
    node = this.parametricChildren[0];
  }

  // 3. Пушим "братьев" в стек для backtracking
  //    (wildcard → parametric[n-1] → ... → parametric[1])
  if (this.wildcardChild) nodeStack.push({ brotherNode: this.wildcardChild, ... });
  for (let i = this.parametricChildren.length - 1; i >= 1; i--) {
    nodeStack.push({ brotherNode: this.parametricChildren[i], ... });
  }

  return node;  // возвращаем лучший вариант (static или parametric[0])
}
```

**Backtracking** — это ключевая фича. Если мы пошли по static-пути и зашли в тупик, мы возвращаемся и пробуем parametric. Если parametric не сработал — пробуем wildcard.

Стек пушится в **обратном порядке приоритета**: wildcard (худший) → parametric (средний) → static (лучший, возвращается сразу). При pop'е из стека получаем следующий по приоритету вариант.

### 10.7 HandlerStorage

В find-my-way `HandlerStorage` сложнее чем нужно тебе — он поддерживает **constraints** (версионирование, хосты и т.д.). Для твоей реализации достаточно простого `Map<Method, Handler>`.

Но одна идея полезна: find-my-way хранит **pre-compiled функцию** для создания объекта params:

```javascript
// Вместо динамического создания { id: "42", name: "alice" }
// find-my-way компилирует функцию:
function buildParams(params) {
  return { id: params[0], name: params[1] }
}
```

Для твоей реализации это overkill — просто собирай params-объект при search.

### 10.8 Что взять из find-my-way, а что упростить

| Из find-my-way | Для твоей реализации |
|----------------|---------------------|
| Отдельное дерево на метод | Одно дерево + HandlerStorage с Map<Method, Handler> |
| staticChildren как Object по первому символу | Массив children (проще) |
| Итеративный find с явным стеком | Можно рекурсивный (проще, для учебного проекта ок) |
| Backtracking через brothersNodesStack | В рекурсивном варианте — просто перебор children |
| Constraints в HandlerStorage | Не нужно — только HTTP-метод |
| Compiled params builder | Не нужно — просто `Record<string, string>` |
| Regex в параметрах (`:id(\d+)`) | Не нужно (валидация через Zod) |
| `matchPrefix` компиляция | Не нужно — `startsWith()` достаточно |
| Split при вставке | **Нужно!** Это ядро radix tree |
| Приоритет Static > Parametric > Wildcard | **Нужно!** |
| prettyPrint | **Нужно!** Для отладки бесценно |

> **Совет**: открой [lib/node.js](https://github.com/delvedor/find-my-way/blob/main/lib/node.js) и читай `createStaticChild()` + `split()` с карандашом, рисуя дерево на бумаге. Это САМЫЙ эффективный способ понять radix tree.

---

## Итого: карта зависимостей компонентов

```
                    Router
                   /      \
            compose()    RouteTree
                          /    \
                       Node    HandlerStorage
                      (Static, Parametric, Wildcard)
```

**Порядок реализации** (рекомендуемый):
1. `HandlerStorage` — самый простой, Map-обёртка
2. `Node` — структура данных узла
3. `RouteTree` — insert, search, split
4. `compose()` — middleware-цепочка (onion)
5. `Router` — координация всего
6. Zod-валидация — надстройка поверх middleware
7. Типизация — StatusBodyMap, TypedResponse
