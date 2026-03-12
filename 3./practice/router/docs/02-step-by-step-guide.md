# Роутер: пошаговое руководство по реализации

> Этот учебник — практический гайд. Здесь нет готового кода, но есть чёткие шаги,
> подсказки, псевдокод, и маркеры "на что обратить внимание".
> Рекомендуется читать после [01-concepts-and-theory.md](./01-concepts-and-theory.md).

---

## Оглавление

- [Шаг 0. Подготовка: структура файлов](#шаг-0-подготовка-структура-файлов)
- [Шаг 1. Типы и интерфейсы](#шаг-1-типы-и-интерфейсы)
- [Шаг 2. HandlerStorage](#шаг-2-handlerstorage)
- [Шаг 3. Node](#шаг-3-node)
- [Шаг 4. RouteTree — insert (без split)](#шаг-4-routetree--insert-без-split)
- [Шаг 5. RouteTree — insert (со split)](#шаг-5-routetree--insert-со-split)
- [Шаг 6. RouteTree — search](#шаг-6-routetree--search)
- [Шаг 7. Тестируем дерево отдельно](#шаг-7-тестируем-дерево-отдельно)
- [Шаг 8. compose()](#шаг-8-compose)
- [Шаг 9. Router — базовый каркас](#шаг-9-router--базовый-каркас)
- [Шаг 10. Router.handle()](#шаг-10-routerhandle)
- [Шаг 11. HTTP-методы (.get, .post, ...)](#шаг-11-http-методы-get-post-)
- [Шаг 12. Middleware (.use)](#шаг-12-middleware-use)
- [Шаг 13. Nesting (.nest)](#шаг-13-nesting-nest)
- [Шаг 14. Zod-валидация](#шаг-14-zod-валидация)
- [Шаг 15. Типизированные ответы](#шаг-15-типизированные-ответы)
- [Шаг 16. prettyPrint()](#шаг-16-prettyprint)
- [Чек-лист: что должно работать](#чек-лист-что-должно-работать)

---

## Шаг 0. Подготовка: структура файлов

Создай следующие файлы:

```
router/
├── index.ts              ← export Router
├── tree.ts               ← RouteTree (radix tree)
├── node.ts               ← Node class
├── handler-storage.ts    ← HandlerStorage
├── compose.ts            ← функция compose
├── types/
│   ├── index.ts          ← Handler, Middleware, Next, Methods, etc.
│   ├── context.d.ts      ← declare global { interface Context {...} }
│   └── status.ts         ← StatusBodyMap, StatusCode
└── index.test.ts         ← скопируй тесты ментора сюда
```

> Совет: начни с пустых файлов и заполняй по мере продвижения.

---

## Шаг 1. Типы и интерфейсы

### types/index.ts

Определи базовые типы:

```
Methods    = "GET" | "POST" | "PATCH" | "DELETE" | "PUT"
Next       = () => Promise<void> | void
Handler    = (ctx: Context, next: Next) => Promise<void> | void
Middleware = Handler   (они идентичны!)
```

### types/context.d.ts

Определи глобальный Context через `declare global`:

```
interface Context {
  req: { url, method, body?, params, query, headers }
  res: { status(code).send(data) }
}
```

**Подсказка**: посмотри на тесты — `createReq()` и `createRes()` показывают точную форму req/res.

### types/status.ts

```
StatusBodyMap — маппинг числовых кодов на типы тел ответов
StatusCode   — union числовых кодов (200 | 201 | 400 | ...)
```

---

## Шаг 2. HandlerStorage

Это самый простой компонент — начни с него.

**Интерфейс**:
- `addHandler(method, handler)` — сохранить handler для метода
- `getHandler(method)` — получить handler | null
- `hasHandlers()` — есть ли хоть один handler

**Внутреннее хранилище**: `Map<Methods, Handler>`

**Проверь**: один путь может иметь разные handler'ы для GET, POST, DELETE.

---

## Шаг 3. Node

Узел дерева. У него есть:

| Поле | Тип | Описание |
|------|-----|----------|
| `path` | string | Строка этого узла ("users", ":id", и т.д.) |
| `type` | Static / Parametric / Wildcard | Тип узла |
| `children` | Node[] | Потомки |
| `paramName` | string \| null | Имя параметра для Parametric нод |
| `handlerStorage` | HandlerStorage | Обработчики этого узла |

**Подсказка**: тип можно сделать через enum или const object:
```
NodeTypes = { Static: "static", Parametric: "parametric", Wildcard: "wildcard" }
```

---

## Шаг 4. RouteTree — insert (без split)

Начни с простой версии insert, которая НЕ умеет split.

### Алгоритм:

```
insert(method, path, handler):
  1. Нормализуй path: убери leading "/"
     ВАЖНО: trailing "/" НЕ убирай!
     Тесты проверяют что "/items" и "/items/" — разные маршруты.
     Нормализация убирает только leading slash:
     "/items" → "items", "/items/" → "items/"
  2. Вызови _insert(root, normalizedPath, method, handler)

_insert(node, path, method, handler):
  1. Если path пустой → node — конечная точка, сохрани handler
  2. Для каждого child из node.children:
     a. Найди commonPrefix между child.path и path
     b. Если commonPrefix === child.path:
        → рекурсия: _insert(child, path.slice(child.path.length), method, handler)
        → return
  3. Если совпадений нет → создай новый узел и добавь в children
```

### Создание нового узла:

Тут логика ветвится по первому символу `path`:
- Начинается с `:` → создай Parametric ноду
  - Извлеки имя параметра (от `:` до `/` или конца строки)
  - Если есть остаток после параметра (напр. `:id/posts`) — рекурсия для остатка
- Начинается с `*` → создай Wildcard ноду
- Иначе → Static нода
  - **Но!** Если в path есть `:` или `*` не в начале (напр. `users/:id`):
    - Разбей на static часть ("users/") и остаток (":id")
    - Создай Static ноду для первой части
    - Рекурсивно вставь остаток

### Проверь на примере:

```
insert(GET, "/users", h1)       → root → "users" [GET]
insert(GET, "/users/:id", h2)   → root → "users" → "/" → :id [GET]
insert(POST, "/users", h3)      → root → "users" [GET, POST]
```

> Нарисуй дерево на бумаге после каждой вставки!
>
> **Референс из find-my-way**: метод `createStaticChild()` в `lib/node.js` —
> он ищет потомка по первому символу, сравнивает побуквенно, и при несовпадении
> вызывает `split()`. Твоя логика `_insert` делает то же самое, но через
> `findCommonPrefix`. Оба подхода валидны.

---

## Шаг 5. RouteTree — insert (со split)

Теперь добавь обработку случая, когда общий префикс **короче** child.path.

### Когда нужен split:

```
Дерево: root → "testing" [GET]
Вставляем: "test"

commonPrefix("testing", "test") = "test" (длина 4)
child.path = "testing" (длина 7)
commonPrefix.length < child.path.length → SPLIT!
```

### Алгоритм split:

```
splitNode(node, splitAt):
  1. childPath = node.path.slice(splitAt)    // "ing"
  2. Создай newChild с path=childPath
  3. Перенеси handler'ы и children из node в newChild
  4. node.path = node.path.slice(0, splitAt) // "test"
  5. Очисти handler'ы node
  6. node.children = [newChild]
```

### После split:

```
root → "test" [пусто]
        └─ "ing" [GET]   ← старый handler переехал сюда
```

Теперь вставляем handler для "test":
```
root → "test" [GET]       ← новый handler
        └─ "ing" [GET]
```

### Добавь split в _insert:

В цикле по children, после нахождения commonPrefix:
```
if (commonPrefix.length > 0 && commonPrefix.length < child.path.length):
  splitNode(child, commonPrefix.length)
  _insert(child, path.slice(commonPrefix.length), method, handler)
  return
```

### Проверь на примере:

```
insert(GET, "/test", h1)     → root → "test" [GET]
insert(GET, "/testing", h2)  → root → "test" [GET] → "ing" [GET]
insert(GET, "/tea", h3)      → root → "te" → "st" [GET] → "ing" [GET]
                                        └─ "a" [GET]
```

---

## Шаг 6. RouteTree — search

### Алгоритм:

```
search(method, path):
  1. Нормализуй path
  2. params = {}
  3. node = _searchNode(root, path, params)
  4. Если node и у него есть handler для method → return { handler, params }
  5. Иначе → null

_searchNode(node, path, params):
  1. Если path пустой → return node (если у него есть handler'ы)
  2. Для каждого child (ПОРЯДОК: Static → Parametric → Wildcard):
     Static:
       Если path.startsWith(child.path):
         result = _searchNode(child, path.slice(child.path.length), params)
         Если result → return result
     Parametric:
       paramValue = path до следующего "/" (или весь path)
       params[child.paramName] = paramValue
       result = _searchNode(child, остаток, params)
       Если result → return result
       Иначе → delete params[child.paramName]  // откат!
     Wildcard:
       params[child.paramName] = весь path
       return child
  3. return null
```

### Важные моменты:

1. **Приоритет**: обходи static-детей первыми. Если `/users/me` совпадает и со static `me` и с parametric `:id`, static побеждает.

2. **Backtracking для Parametric**: если parametric путь зашёл в тупик, нужно **откатить** params и попробовать следующего потомка.

3. **Нормализация path**: убирай leading `/` при рекурсии, чтобы не было `/` в начале.

> **Референс из find-my-way**: метод `find()` в `index.js` и `getNextNode()` в `lib/node.js`.
> find-my-way реализует поиск **итеративно** с явным стеком `brothersNodesStack` для backtracking.
> Ты можешь сделать проще — **рекурсивно**: обходишь children в порядке
> Static → Parametric → Wildcard, если рекурсия вернула null — пробуешь следующего child.
> Это и есть backtracking, просто через стек вызовов.

---

## Шаг 7. Тестируем дерево отдельно

Прежде чем переходить к Router, убедись что дерево работает:

```typescript
const tree = new RouteTree();
tree.insert("GET", "/users", handler1);
tree.insert("GET", "/users/:id", handler2);
tree.insert("GET", "/users/me", handler3);

// Проверь:
tree.search("GET", "/users")      → handler1, params: {}
tree.search("GET", "/users/42")   → handler2, params: { id: "42" }
tree.search("GET", "/users/me")   → handler3, params: {} (static приоритет!)
tree.search("POST", "/users")     → null (нет POST handler'а)
```

> Рекомендация: напиши отдельные unit-тесты для RouteTree.

---

## Шаг 8. compose()

Это сердце onion-middleware. Вынеси в отдельный файл `compose.ts`.

### Сигнатура:

```
compose(middlewares: Middleware[]): (ctx: Context, next?: Next) => Promise<void>
```

### Алгоритм:

```
compose(middlewares):
  return (ctx, finalNext) => {
    index = -1

    dispatch(i):
      if i <= index → reject("next() called multiple times")
      index = i

      fn = middlewares[i] ИЛИ finalNext (когда i === middlewares.length)
      if !fn → resolve()

      try:
        return Promise.resolve(fn(ctx, () => dispatch(i + 1)))
      catch(err):
        return Promise.reject(err)

    return dispatch(0)
  }
```

### Ключевые моменты:

1. **Promise.resolve()** обёртка — чтобы синхронные middleware тоже работали
2. **Защита от double-next**: `if i <= index` — если `next()` вызвали дважды, это ошибка
3. **finalNext**: когда middleware кончились, вызывается finalNext (или ничего)
4. **try/catch**: перехватывает синхронные ошибки

### Проверь onion-модель:

```
middleware1: push("1-in"), await next(), push("1-out")
middleware2: push("2-in"), await next(), push("2-out")
handler:    push("handler")

compose([mw1, mw2, handler])(ctx)
→ order: ["1-in", "2-in", "handler", "2-out", "1-out"]
```

> **Референсы**:
> - [koa-compose](https://github.com/koajs/compose/blob/master/index.js) — эталонная реализация, 25 строк
> - find-my-way **не** включает compose — это только routing. Middleware-слой ты строишь сам,
>   вдохновляясь Koa. find-my-way отвечает за `tree.insert()` и `tree.search()`, а compose — за цепочку обработчиков.

---

## Шаг 9. Router — базовый каркас

```typescript
class Router {
  private tree: RouteTree
  private currentMiddleware: Middleware[]  // текущий стек middleware

  constructor()

  use(middleware): this
  get(path, ...): this
  post(path, ...): this
  patch(path, ...): this
  delete(path, ...): this
  nest(path, callback): this
  handle(req, res): Promise<void>
}
```

**Ключевая идея**: Router хранит `currentMiddleware` — массив middleware, добавленных через `.use()`. Когда регистрируется маршрут через `.get()`, делается **snapshot** этого массива.

---

## Шаг 10. Router.handle()

```
handle(req, res):
  1. Парси URL: отдели path от query string
     path = url.split("?")[0]
     query = parseQuery(url)  // URL после "?"

  2. Найди маршрут:
     result = tree.search(req.method, path)
     // result = { handler: composedFunction, params: { id: "42" } }

  3. Если маршрут не найден → return (ничего не делаем)

  4. Создай Context (НОВЫЙ для каждого запроса!):
     ctx = { req: { ...req, params: result.params, query }, res }

  5. Вызови handler:
     await result.handler(ctx, async () => {})
     // handler УЖЕ содержит все middleware — compose произошёл
     // при регистрации маршрута в addRoute() (шаг 11)
```

> **Важно**: compose вызывается НЕ здесь, а в `addRoute()` при регистрации.
> handle() — это просто search + вызов. Вся тяжёлая работа уже сделана.

### Парсинг query string:

```typescript
// "?q=hello&page=1" → { q: "hello", page: "1" }
function parseQuery(url: string): Record<string, string> {
  const idx = url.indexOf("?");
  if (idx === -1) return {};
  // URLSearchParams умеет работать и с "?q=hello" и с "q=hello"
  const params = new URLSearchParams(url.slice(idx + 1));
  return Object.fromEntries(params.entries());
}
```

---

## Шаг 11. HTTP-методы (.get, .post, ...)

### Подход: "snapshot middleware при регистрации"

> **Заметка**: сейчас делаем простую версию `get(path, handler)`.
> В шаге 14 мы добавим перегрузку `get(path, opts, handler)` для Zod-валидации.
> Для этого понадобится TypeScript function overloading — когда одна функция
> имеет несколько сигнатур. Внутри реализации проверяешь `typeof` второго аргумента
> чтобы понять, это `Handler` или `RouteOptions`.

```
get(path, handler):
  1. Запомни текущий currentMiddleware: snapshot = [...this.currentMiddleware]
  2. Compose snapshot + handler в одну функцию:
     composed = compose([...snapshot, handler])
  3. Вставь в дерево уже скомпонованную функцию:
     tree.insert("GET", fullPath, composed)
  4. return this
```

### Где хранить snapshot?

**Вариант A**: В HandlerStorage вместе с handler хранить и middleware-стек.

**Вариант B**: Отдельная Map: `routeKey → middlewareSnapshot`. Ключ = `"GET:/users"`.

**Вариант C**: Handler в дереве — это уже compose(snapshot + originalHandler). То есть при регистрации ты сразу compose'ишь всё.

> Вариант C — самый элегантный. Handler в дереве = уже готовая composed-функция.

### Как тесты это проверяют:

```typescript
router
  .get("/first", h1)     // snapshot: [] (пусто)
  .use(logger)            // добавляется в стек
  .get("/second", h2)     // snapshot: [logger]

// GET /first  → h1 (без logger!)
// GET /second → logger → h2
```

---

## Шаг 12. Middleware (.use)

```
use(middleware):
  1. Добавь middleware в this.currentMiddleware
  2. return this
```

Просто добавление в массив. Вся магия — в том, что `.get()` делает snapshot на момент вызова.

---

## Шаг 13. Nesting (.nest)

```
nest(prefix, callback):
  1. Создай дочерний Router: child = new Router()
  2. Скопируй текущий currentMiddleware в child:
     child.currentMiddleware = [...this.currentMiddleware]
  3. Вызови callback(child) — пользователь наполнит child маршрутами
  4. Перенеси маршруты из child в this.tree с добавлением prefix к путям
  5. return this
```

### Перенос маршрутов:

После callback(child), дочерний роутер содержит дерево с маршрутами (middleware уже
скомпонованы внутри handler'ов при addRoute). Нужно "вытащить" все маршруты из child.tree
и вставить их в this.tree с добавлением prefix.

**Алгоритм collectRoutes** — рекурсивный обход дерева child:

```
collectRoutes(node, currentPath):
  results = []

  // Собираем path этого узла
  nodePath = currentPath + node.path

  // Если у узла есть handler'ы — это маршрут
  if node.hasHandlers():
    path = nodePath.startsWith("/") ? nodePath : "/" + nodePath
    results.push({ path, handlers: node.getAllHandlers() })

  // Рекурсия по потомкам
  for child in node.children:
    // Для parametric/wildcard нод добавляем "/" между static и :param
    // НО: если nodePath уже заканчивается на "/", не дублируем
    childPrefix = (child.type === Parametric|Wildcard)
      ? (nodePath.endsWith("/") ? nodePath : nodePath + "/")
      : nodePath
    results.push(...collectRoutes(child, childPrefix))

  return results
```

Затем для каждого собранного маршрута: `fullPath = prefix + route.path` →
вставляем handler'ы в this.tree.

> Этот алгоритм нужен потому что Radix Tree хранит маршруты в сжатом виде
> (path разбит по узлам). Чтобы получить полные пути, нужно конкатенировать
> path'ы от корня до листа.

### Альтернативный подход:

Вместо переноса маршрутов, можно при `handle()` проверять prefix и делегировать:

```
nest(prefix, callback):
  child = new Router()
  child.currentMiddleware = [...this.currentMiddleware]
  callback(child)

  // Добавляем middleware-обёртку
  this.use((ctx, next) => {
    if (ctx.req.url.startsWith(prefix)):
      // Подменяем URL (убираем prefix) и делегируем child
      child.handle(modifiedReq, ctx.res)
    else:
      next()
  })
```

> Первый подход (перенос в одно дерево) — проще для radix tree и работает лучше с приоритетами.

### Что проверяют тесты:

1. `parent middleware → nested handler` — parent middleware работает для вложенных
2. `nested middleware ↛ parent handler` — вложенная middleware НЕ утекает
3. `deeply nested` — `/api/v1/users/:id` работает через вложенные nest
4. `middleware scope across nesting`:
   ```
   .use(logger)
   .nest("/api", r => r
     .use(auth)
     .get("/public", ...)   // logger, auth
     .use(db)
     .get("/private", ...)  // logger, auth, db
   )
   .get("/health", ...)     // logger (БЕЗ auth и db!)
   ```

---

## Шаг 14. Zod-валидация

### Расширяем сигнатуру HTTP-методов:

```
get(path, handler): this                          // без валидации
get(path, options: RouteOptions, handler): this   // с валидацией
```

Можно использовать перегрузки TypeScript:
```typescript
get(path: string, handler: Handler): this;
get(path: string, opts: RouteOptions, handler: Handler): this;
get(path: string, optsOrHandler: RouteOptions | Handler, maybeHandler?: Handler): this {
  // разобрать аргументы
}
```

### Создание validation middleware:

```
createValidationMiddleware(schema):
  return (ctx, next) => {
    if schema.body:
      result = schema.body.safeParse(ctx.req.body)
      if !result.success → ctx.res.status(400).send({error: ...}), return

    if schema.params:
      result = schema.params.safeParse(ctx.req.params)
      if !result.success → ctx.res.status(400).send({error: ...}), return

    if schema.query:
      result = schema.query.safeParse(ctx.req.query)
      if !result.success → ctx.res.status(400).send({error: ...}), return

    // Если всё ок — next()
    return next()
  }
```

### Валидация response:

Это сложнее — нужно перехватить `ctx.res.status(code).send(data)`:

```
createResponseValidationMiddleware(responseSchemas):
  return async (ctx, next) => {
    // Оборачиваем res.status().send() для перехвата
    const originalStatus = ctx.res.status.bind(ctx.res)

    ctx.res.status = (code) => {
      const result = originalStatus(code)
      const originalSend = result.send.bind(result)

      result.send = (data) => {
        if responseSchemas[code]:
          const validation = responseSchemas[code].safeParse(data)
          if !validation.success → throw new Error(...)
        originalSend(data)
      }

      return result
    }

    await next()
  }
```

### Вставляем в стек:

```
get(path, opts, handler):
  stack = [...currentMiddleware]
  if opts.schema:
    stack.push(createValidationMiddleware(opts.schema))
    if opts.schema.response:
      stack.push(createResponseValidationMiddleware(opts.schema.response))
  stack.push(handler)
  // сохраняем composed stack
```

---

## Шаг 15. Типизированные ответы

### StatusBodyMap:

```typescript
interface StatusBodyMap<T = unknown> {
  200: T;
  201: unknown;
  204: never;
  400: { error: string };
  401: { error: string };
  // ...
}
```

### TypedResponse:

```typescript
interface TypedResponse {
  status<S extends StatusCode>(code: S): {
    send(body: StatusBodyMap[S]): void;
  };
}
```

Когда handler вызывает `ctx.res.status(400).send(...)`, TypeScript подсказывает, что тело должно быть `{ error: string }`.

> Это работает на уровне типов — runtime-проверка не нужна (кроме Zod response validation для дополнительной безопасности).

---

## Шаг 16. prettyPrint()

Рекурсивный обход дерева с форматированием:

```
prettyPrint():
  _print(root, "", true)

_print(node, prefix, isLast):
  connector = isLast ? "└── " : "├── "
  label = node.path + методы из handlerStorage
  print(prefix + connector + label)

  childPrefix = prefix + (isLast ? "    " : "│   ")
  for each child in node.children:
    _print(child, childPrefix, child === lastChild)
```

> См. find-my-way `lib/pretty-print.js` для референса.

---

## Маппинг: шаг → какие тесты запускать

После каждого крупного шага запускай соответствующую группу тестов. Это позволяет ловить баги рано, а не в конце.

| После шага | Запусти describe(...) | Что проверяется |
|---|---|---|
| Шаг 7 (tree отдельно) | Напиши свои тесты для RouteTree | insert, search, split, параметры |
| Шаги 8-12 (Router + use + get + handle) | `"chainable API"` | Методы возвращают this |
| | `"HTTP method routing"` | GET/POST/PATCH/DELETE, wrong method/path |
| | `"handler context"` | ctx.req, ctx.res, query, params |
| | `"middleware"` | Порядок, snapshot, next(), обогащение ctx |
| | `"routes as middleware"` | handler = финальная mw, onion, short-circuit |
| Шаг 13 (nest) | `"nesting"` | Prefix, scope, deeply nested, middleware isolation |
| Шаг 13 + шаг 6 | `"radix tree routing"` | Параметры, shared prefixes, static priority |
| Шаг 14 (Zod) | `"schema validation"` | body, params, query, response validation |
| Финал | `"edge cases"` | Пустой роутер, trailing slash, concurrent requests |

```bash
# Запуск одной группы тестов:
npx vitest run --reporter=verbose -t "HTTP method routing"

# Или все тесты:
npx vitest run
```

---

## Чек-лист: что должно работать

Пройдись по тестам ментора (`index.test.ts`) и убедись:

- [ ] **Chainable API**: все методы возвращают `this`
- [ ] **HTTP routing**: GET, POST, PATCH, DELETE работают
- [ ] **Wrong method/path**: не матчится
- [ ] **Разные методы на одном пути**: независимы
- [ ] **Handler context**: ctx.req, ctx.res, ctx.req.query, ctx.req.params
- [ ] **Middleware order**: top-down, snapshot на момент регистрации
- [ ] **Middleware не применяется к маршрутам ДО неё**
- [ ] **next() не вызван — цепочка стоп**
- [ ] **Обогащение контекста**: ctx.userId = "..."
- [ ] **Async middleware**: await next()
- [ ] **Onion model**: mw1-in → mw2-in → handler → mw2-out → mw1-out
- [ ] **Nesting**: prefix + middleware scope
- [ ] **Deeply nested**: /a/b/c
- [ ] **Nested middleware не утекает наружу**
- [ ] **Radix tree**: параметры, shared prefixes, static priority
- [ ] **Zod body/params/query validation**: 400 при ошибке
- [ ] **Zod response validation**: throw при невалидном ответе
- [ ] **Routes as middleware**: handler = финальная middleware
- [ ] **Error propagation**: throw в middleware → rejects
- [ ] **Concurrent requests**: изолированный ctx
- [ ] **Trailing slash**: /items и /items/ — разные
