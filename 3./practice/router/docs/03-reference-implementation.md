# Роутер: референсная реализация (куски кода)

> Этот учебник — на крайний случай, когда что-то не получается.
> Здесь реальный код для каждого компонента. Старайся не читать его целиком —
> заглядывай только в ту секцию, с которой застрял.
>
> Предполагается, что ты прочитал:
> - [01-concepts-and-theory.md](./01-concepts-and-theory.md)
> - [02-step-by-step-guide.md](./02-step-by-step-guide.md)

---

## Оглавление

- [1. Типы (types/index.ts)](#1-типы-typesindexts)
- [2. StatusBodyMap (types/status.ts)](#2-statusbodymap-typesstatusts)
- [3. Context (types/context.d.ts)](#3-context-typescontextdts)
- [4. HandlerStorage](#4-handlerstorage)
- [5. Node](#5-node)
- [6. RouteTree — полная реализация](#6-routetree--полная-реализация)
  - [6.1 Конструктор и нормализация](#61-конструктор-и-нормализация)
  - [6.2 insert](#62-insert)
  - [6.3 split](#63-split)
  - [6.4 createNode](#64-createnode)
  - [6.5 search](#65-search)
- [7. compose()](#7-compose)
- [8. Router — полная реализация](#8-router--полная-реализация)
  - [8.1 Каркас и типы](#81-каркас-и-типы)
  - [8.2 use()](#82-use)
  - [8.3 addRoute() — ядро HTTP-методов](#83-addroute--ядро-http-методов)
  - [8.4 get/post/patch/delete](#84-getpostpatchdelete)
  - [8.5 handle()](#85-handle)
  - [8.6 nest()](#86-nest)
  - [8.7 Zod-валидация](#87-zod-валидация)
- [9. Собираем всё вместе](#9-собираем-всё-вместе)

---

## 1. Типы (types/index.ts)

```typescript
export type Methods = "DELETE" | "GET" | "PATCH" | "POST" | "PUT";

export type Next = () => Promise<void> | void;

export type Handler = (ctx: Context, next: Next) => Promise<void> | void;

export type Middleware = Handler;

export type ParamsType = Record<string, string>;
```

> `Handler` и `Middleware` — один и тот же тип. Handler — это просто последняя middleware в цепочке.

---

## 2. StatusBodyMap (types/status.ts)

```typescript
export interface StatusBodyMap<T = unknown> {
  200: T;
  201: unknown;
  204: never;
  400: { error: string };
  401: { error: string };
  403: { error: string };
  404: { error: string };
  500: { error: string };
}

export type StatusCode = keyof StatusBodyMap;
```

---

## 3. Context (types/context.d.ts)

> **Важно**: в тестах ментора используется имя `Context2`, чтобы не конфликтовать
> с другими объявлениями в проекте. Если хочешь чтобы тесты работали без изменений —
> назови свой интерфейс `Context2`. Или назови `Context` и поправь тесты.

```typescript
import { StatusBodyMap, StatusCode } from "./status.ts";

declare global {
  interface AppRequest {
    body?: unknown;
    headers: Record<string, string>;
    method: string;
    params: Record<string, string>;
    query: Record<string, string>;
    url: string;
  }

  interface AppResponse {
    body?: unknown;
    statusCode?: number;
    status(code: number): { send(data: unknown): void };
  }

  // Основной тип контекста — расширяемый через declaration merging
  interface Context {
    req: AppRequest;
    res: AppResponse;
  }
}

export {};
```

> `export {}` нужен чтобы файл был модулем (иначе `declare global` не скомпилируется).

---

## 4. HandlerStorage

```typescript
import { Handler, Methods } from "./types";

export class HandlerStorage {
  private handlers = new Map<Methods, Handler>();

  addHandler(method: Methods, handler: Handler): void {
    this.handlers.set(method, handler);
  }

  getHandler(method: Methods): Handler | null {
    return this.handlers.get(method) ?? null;
  }

  hasHandlers(): boolean {
    return this.handlers.size > 0;
  }

  getAllowedMethods(): Methods[] {
    return Array.from(this.handlers.keys());
  }
}
```

---

## 5. Node

```typescript
import { HandlerStorage } from "./handler-storage.ts";

export const NodeTypes = {
  Parametric: "parametric",
  Static: "static",
  Wildcard: "wildcard",
} as const;

export type NodeType = (typeof NodeTypes)[keyof typeof NodeTypes];

export class Node {
  path: string;
  type: NodeType;
  children: Node[] = [];
  paramName: string | null = null;
  handlerStorage = new HandlerStorage();

  constructor(path = "", type: NodeType = NodeTypes.Static) {
    this.path = path;
    this.type = type;
  }
}
```

---

## 6. RouteTree — полная реализация

### 6.1 Конструктор и нормализация

```typescript
import { HandlerStorage } from "./handler-storage.ts";
import { Node, NodeTypes } from "./node.ts";
import { Handler, Methods, ParamsType } from "./types";

export class RouteTree {
  root = new Node();

  // Убираем leading слэш для внутреннего использования
  // ВАЖНО: trailing "/" НЕ убираем — тесты проверяют что "/items" и "/items/" это разные маршруты
  private normalize(path: string): string {
    if (path.startsWith("/")) {
      path = path.slice(1);
    }
    return path;
  }

  private findCommonPrefix(a: string, b: string): string {
    let i = 0;
    const min = Math.min(a.length, b.length);
    while (i < min && a[i] === b[i]) i++;
    return a.slice(0, i);
  }
```

### 6.2 insert

```typescript
  insert(method: Methods, path: string, handler: Handler): void {
    path = this.normalize(path);
    this._insert(this.root, path, method, handler);
  }

  private _insert(node: Node, path: string, method: Methods, handler: Handler): void {
    // Пустой path → конечный узел
    if (!path.length) {
      node.handlerStorage.addHandler(method, handler);
      return;
    }

    // Ищем существующего потомка с общим префиксом
    for (const child of node.children) {
      // Пропускаем Parametric/Wildcard — у них свой match
      if (child.type !== NodeTypes.Static) continue;

      const prefix = this.findCommonPrefix(child.path, path);

      if (prefix.length === 0) continue;

      // Полное совпадение с child.path → идём глубже
      if (prefix.length === child.path.length) {
        this._insert(child, path.slice(prefix.length), method, handler);
        return;
      }

      // Частичное совпадение → split
      if (prefix.length < child.path.length) {
        this.splitNode(child, prefix.length);
        this._insert(child, path.slice(prefix.length), method, handler);
        return;
      }
    }

    // Проверяем Parametric потомков
    if (path.startsWith(":")) {
      const slashIdx = path.indexOf("/", 1);
      const paramName = slashIdx === -1 ? path.slice(1) : path.slice(1, slashIdx);

      // Ищем существующий parametric узел с таким же именем
      for (const child of node.children) {
        if (child.type === NodeTypes.Parametric && child.paramName === paramName) {
          const remaining = slashIdx === -1 ? "" : path.slice(slashIdx);
          this._insert(child, remaining, method, handler);
          return;
        }
      }
    }

    // Новый узел
    this._createNode(node, path, method, handler);
  }
```

### 6.3 split

```typescript
  private splitNode(node: Node, splitAt: number): void {
    // "testing" split at 4 → "test" + "ing"
    const childPath = node.path.slice(splitAt);
    const newChild = new Node(childPath, NodeTypes.Static);

    // Переносим handler'ы и потомков
    newChild.handlerStorage = node.handlerStorage;
    newChild.children = node.children;

    // Обрезаем текущий узел
    node.path = node.path.slice(0, splitAt);
    node.handlerStorage = new HandlerStorage();
    node.children = [newChild];
  }
```

### 6.4 createNode

```typescript
  private _createNode(
    parent: Node,
    path: string,
    method: Methods,
    handler: Handler,
  ): void {
    if (path.startsWith(":")) {
      // Parametric node
      const slashIdx = path.indexOf("/", 1);
      const paramName = slashIdx === -1 ? path.slice(1) : path.slice(1, slashIdx);
      const remaining = slashIdx === -1 ? "" : path.slice(slashIdx);

      const paramNode = new Node(`:${paramName}`, NodeTypes.Parametric);
      paramNode.paramName = paramName;
      parent.children.push(paramNode);

      if (remaining.length) {
        this._insert(paramNode, remaining, method, handler);
      } else {
        paramNode.handlerStorage.addHandler(method, handler);
      }
    } else if (path.startsWith("*")) {
      // Wildcard node
      const name = path.slice(1) || "wildcard";
      const wildNode = new Node(name, NodeTypes.Wildcard);
      wildNode.paramName = name;
      wildNode.handlerStorage.addHandler(method, handler);
      parent.children.push(wildNode);
    } else {
      // Static node — но может содержать : или * внутри
      const paramIdx = path.indexOf(":");
      const wildIdx = path.indexOf("*");

      let specialIdx = -1;
      if (paramIdx !== -1 && wildIdx !== -1) {
        specialIdx = Math.min(paramIdx, wildIdx);
      } else if (paramIdx !== -1) {
        specialIdx = paramIdx;
      } else if (wildIdx !== -1) {
        specialIdx = wildIdx;
      }

      if (specialIdx !== -1) {
        // Разделяем: static часть + спец.часть
        // "users/:id" → staticPart="users/", remaining=":id"
        const staticPart = path.slice(0, specialIdx);
        const remaining = path.slice(specialIdx);

        // НЕ убираем trailing slash из staticPart!
        // Slash — часть пути. "users/" — это путь static ноды.
        // _insert уберёт leading slash из remaining при рекурсии.

        if (staticPart.length > 0) {
          const staticNode = new Node(staticPart, NodeTypes.Static);
          parent.children.push(staticNode);
          this._insert(staticNode, remaining, method, handler);
        } else {
          // staticPart пуст → сразу parametric/wildcard
          this._insert(parent, remaining, method, handler);
        }
      } else {
        // Чистый static путь
        const staticNode = new Node(path, NodeTypes.Static);
        staticNode.handlerStorage.addHandler(method, handler);
        parent.children.push(staticNode);
      }
    }
  }
```

### 6.5 search

```typescript
  search(method: Methods, path: string): { handler: Handler; params: ParamsType } | null {
    path = this.normalize(path);
    const params: ParamsType = {};
    const node = this._searchNode(this.root, path, params);

    if (!node) return null;

    const handler = node.handlerStorage.getHandler(method);
    return handler ? { handler, params } : null;
  }

  private _searchNode(node: Node, path: string, params: ParamsType): Node | null {
    // Пустой path → мы на месте
    if (path.length === 0) {
      return node.handlerStorage.hasHandlers() ? node : null;
    }

    // 1) Сначала Static потомки (приоритет!)
    for (const child of node.children) {
      if (child.type !== NodeTypes.Static) continue;

      if (path.startsWith(child.path)) {
        const remaining = path.slice(child.path.length);
        const result = this._searchNode(child, remaining, params);
        if (result) return result;
      }
    }

    // 2) Потом Parametric
    for (const child of node.children) {
      if (child.type !== NodeTypes.Parametric) continue;

      const slashIdx = path.indexOf("/");
      const paramValue = slashIdx === -1 ? path : path.slice(0, slashIdx);
      const remaining = slashIdx === -1 ? "" : path.slice(slashIdx);

      if (child.paramName) {
        params[child.paramName] = paramValue;
        const result = this._searchNode(child, remaining, params);
        if (result) return result;
        delete params[child.paramName]; // backtrack
      }
    }

    // 3) Потом Wildcard
    for (const child of node.children) {
      if (child.type !== NodeTypes.Wildcard) continue;
      if (child.paramName) {
        params[child.paramName] = path;
        return child;
      }
    }

    return null;
  }
}
```

---

## 7. compose()

```typescript
import { Middleware, Next } from "./types";

/**
 * Koa-style middleware composer.
 * Превращает массив middleware в одну функцию с onion-моделью.
 */
export function compose(middlewares: Middleware[]) {
  return (ctx: Context, finalNext?: Next): Promise<void> => {
    let index = -1;

    const dispatch = (i: number): Promise<void> => {
      // Защита от вызова next() дважды
      if (i <= index) {
        return Promise.reject(new Error("next() called multiple times"));
      }
      index = i;

      // Берём текущую middleware или finalNext
      const fn = i < middlewares.length ? middlewares[i] : finalNext;

      if (!fn) {
        return Promise.resolve();
      }

      try {
        // Promise.resolve оборачивает результат — работает и с sync, и с async
        return Promise.resolve(fn(ctx, () => dispatch(i + 1)));
      } catch (err) {
        return Promise.reject(err);
      }
    };

    return dispatch(0);
  };
}
```

> Это почти дословно [koa-compose](https://github.com/koajs/compose/blob/master/index.js).
> Ключевой момент: `fn(ctx, () => dispatch(i + 1))` — когда middleware вызывает `next()`,
> она на самом деле вызывает `dispatch(i + 1)`, что запускает следующую middleware.
> Если middleware делает `await next()`, она ждёт пока ВСЕ нижестоящие завершатся,
> и потом продолжает свой код (onion).

---

## 8. Router — полная реализация

### 8.1 Каркас и типы

```typescript
import { z } from "zod";

import { compose } from "./compose.ts";
import { RouteTree } from "./tree.ts";
import { Handler, Methods, Middleware, Next } from "./types";

interface RouteSchema {
  body?: z.ZodType;
  params?: z.ZodType;
  query?: z.ZodType;
  response?: Partial<Record<number, z.ZodType>>;
}

interface RouteOptions {
  schema?: RouteSchema;
}

```

### 8.2 use()

```typescript
export class Router {
  private tree = new RouteTree();
  private currentMiddleware: Middleware[] = [];

  use(middleware: Middleware): this {
    this.currentMiddleware.push(middleware);
    return this;
  }
```

### 8.3 addRoute() — ядро HTTP-методов

```typescript
  private addRoute(
    method: Methods,
    path: string,
    opts: RouteOptions | Handler,
    handler?: Handler,
  ): this {
    // Разбираем перегруженные аргументы
    let actualHandler: Handler;
    let schema: RouteSchema | undefined;

    if (typeof opts === "function") {
      actualHandler = opts;
    } else {
      schema = opts.schema;
      actualHandler = handler!;
    }

    // Snapshot текущих middleware
    const middlewareSnapshot = [...this.currentMiddleware];

    // Собираем стек: middleware + (валидация?) + handler
    const stack: Middleware[] = [...middlewareSnapshot];

    // Добавляем валидационную middleware если есть schema
    if (schema) {
      stack.push(this.createValidationMiddleware(schema));
    }

    // Response validation ПЕРЕД handler'ом — не ошибка!
    // Она перехватывает res.status().send(), потом вызывает await next() (handler).
    // Когда handler вызовет send() — сработает перехватчик с проверкой.
    // Это onion: responseValidation-in → handler → responseValidation проверяет send()
    if (schema?.response) {
      stack.push(this.createResponseValidationMiddleware(schema.response));
    }

    stack.push(actualHandler);

    // Compose всего стека в одну функцию
    const composed = compose(stack);

    // Вставляем в дерево "заглушку" — handler который вызовет composed
    // Используем уникальный обработчик для этого маршрута
    const routeHandler: Handler = (ctx, next) => composed(ctx, next);

    this.tree.insert(method, path, routeHandler);

    return this;
  }
```

> **Ключевая идея**: при регистрации маршрута мы snapshot'им текущий middleware-стек,
> compose'им всё в одну функцию, и кладём её в дерево. При `handle()` достаточно
> найти handler в дереве и вызвать его — middleware уже внутри.

### 8.4 get/post/patch/delete

```typescript
  get(path: string, handler: Handler): this;
  get(path: string, opts: RouteOptions, handler: Handler): this;
  get(path: string, optsOrHandler: RouteOptions | Handler, maybeHandler?: Handler): this {
    return this.addRoute("GET", path, optsOrHandler, maybeHandler);
  }

  post(path: string, handler: Handler): this;
  post(path: string, opts: RouteOptions, handler: Handler): this;
  post(path: string, optsOrHandler: RouteOptions | Handler, maybeHandler?: Handler): this {
    return this.addRoute("POST", path, optsOrHandler, maybeHandler);
  }

  patch(path: string, handler: Handler): this;
  patch(path: string, opts: RouteOptions, handler: Handler): this;
  patch(path: string, optsOrHandler: RouteOptions | Handler, maybeHandler?: Handler): this {
    return this.addRoute("PATCH", path, optsOrHandler, maybeHandler);
  }

  delete(path: string, handler: Handler): this;
  delete(path: string, opts: RouteOptions, handler: Handler): this;
  delete(path: string, optsOrHandler: RouteOptions | Handler, maybeHandler?: Handler): this {
    return this.addRoute("DELETE", path, optsOrHandler, maybeHandler);
  }
```

### 8.5 handle()

```typescript
  async handle(req: AppRequest, res: AppResponse): Promise<void> {
    // 1. Парсим URL
    const urlParts = req.url.split("?");
    const path = urlParts[0];
    const query = this.parseQuery(req.url);

    // 2. Ищем маршрут в дереве
    const result = this.tree.search(req.method as Methods, path);

    if (!result) {
      // Нет маршрута — ничего не делаем
      // (можно добавить 404, но тесты ожидают тишину)
      return;
    }

    // 3. Создаём Context (НОВЫЙ для каждого запроса!)
    const ctx: Context = {
      req: {
        ...req,
        params: result.params,
        query,
      },
      res,
    };

    // 4. Вызываем handler (который уже содержит всё middleware)
    await result.handler(ctx, async () => {});
  }

  private parseQuery(url: string): Record<string, string> {
    const idx = url.indexOf("?");
    if (idx === -1) return {};
    const params = new URLSearchParams(url.slice(idx + 1));
    return Object.fromEntries(params.entries());
  }
```

### 8.6 nest()

```typescript
  nest(prefix: string, callback: (router: Router) => void): this {
    // 1. Создаём дочерний роутер
    const child = new Router();

    // 2. Копируем текущий middleware-стек
    //    Вложенные маршруты наследуют parent middleware
    child.currentMiddleware = [...this.currentMiddleware];

    // 3. Пользователь наполняет дочерний роутер
    callback(child);

    // 4. Переносим маршруты из child в наше дерево с prefix
    //    Для каждого маршрута в child.tree — добавляем prefix
    this.importChildRoutes(child, prefix);

    return this;
  }

  // Не забудь импортировать Node из "./node.ts" для collectRoutes()
  private importChildRoutes(child: Router, prefix: string): void {
    // Рекурсивно обходим дерево child и вставляем в this.tree
    // с добавлением prefix к путям
    //
    // Простой подход: ре-регистрируем все маршруты child с prefix
    // Это работает потому что при addRoute() мы уже snapshot'или middleware

    // Обходим дерево child и собираем все маршруты
    const routes = this.collectRoutes(child.tree.root, "");

    for (const route of routes) {
      const fullPath = prefix + (route.path.startsWith("/") ? route.path : "/" + route.path);

      for (const [method, handler] of route.handlers) {
        this.tree.insert(method, fullPath, handler);
      }
    }
  }

  private collectRoutes(
    node: Node,
    currentPath: string,
  ): Array<{ path: string; handlers: [Methods, Handler][] }> {
    const results: Array<{ path: string; handlers: [Methods, Handler][] }> = [];

    const nodePath = node.path ? currentPath + node.path : currentPath;

    // Собираем handler'ы этого узла
    const methods = node.handlerStorage.getAllowedMethods();
    if (methods.length > 0) {
      const handlers: [Methods, Handler][] = methods.map((m) => [
        m,
        node.handlerStorage.getHandler(m)!,
      ]);
      results.push({ path: nodePath.startsWith("/") ? nodePath : "/" + nodePath, handlers });
    }

    // Рекурсия по потомкам
    for (const child of node.children) {
      const childPrefix =
        child.type === "parametric" || child.type === "wildcard"
          ? (nodePath.endsWith("/") ? nodePath : nodePath + "/")
          : nodePath;
      results.push(...this.collectRoutes(child, childPrefix));
    }

    return results;
  }
```

> **Альтернативный (более простой) подход к nest():**
>
> Вместо обхода дерева, можно перехватить вызовы `addRoute` у child:

```typescript
  // Более простой вариант nest():
  nest(prefix: string, callback: (router: Router) => void): this {
    // Создаём "proxy" роутер, который при addRoute добавляет prefix
    const child = new NestableRouter(this, prefix, [...this.currentMiddleware]);
    callback(child);
    return this;
  }

  // Где NestableRouter — это Router, у которого addRoute
  // вставляет в parent.tree с prefix + path
```

> Но первый подход (сбор + перенос) более прямолинейный и проще для отладки.

### 8.7 Zod-валидация

```typescript
  private createValidationMiddleware(schema: RouteSchema): Middleware {
    return (ctx: Context, next: Next) => {
      // Валидация body
      if (schema.body) {
        const result = schema.body.safeParse(ctx.req.body);
        if (!result.success) {
          ctx.res.status(400).send({
            error: result.error.message,
          });
          return; // НЕ вызываем next() — цепочка стоп
        }
      }

      // Валидация params
      if (schema.params) {
        const result = schema.params.safeParse(ctx.req.params);
        if (!result.success) {
          ctx.res.status(400).send({
            error: result.error.message,
          });
          return;
        }
      }

      // Валидация query
      if (schema.query) {
        const result = schema.query.safeParse(ctx.req.query);
        if (!result.success) {
          ctx.res.status(400).send({
            error: result.error.message,
          });
          return;
        }
      }

      // Всё ок — передаём управление дальше
      return next();
    };
  }

  private createResponseValidationMiddleware(
    responseSchemas: Partial<Record<number, z.ZodType>>,
  ): Middleware {
    return async (ctx: Context, next: Next) => {
      // Перехватываем res.status().send()
      const originalStatus = ctx.res.status.bind(ctx.res);

      ctx.res.status = (code: number) => {
        const statusResult = originalStatus(code);
        const originalSend = statusResult.send.bind(statusResult);

        statusResult.send = (data: unknown) => {
          // Проверяем response schema для этого статус-кода
          const responseSchema = responseSchemas[code];
          if (responseSchema) {
            const validation = responseSchema.safeParse(data);
            if (!validation.success) {
              throw new Error(
                `Response validation failed for status ${code}: ${validation.error.message}`,
              );
            }
          }
          // Всё ок — вызываем оригинальный send
          originalSend(data);
        };

        return statusResult;
      };

      // Продолжаем цепочку — handler вызовет ctx.res.status().send()
      await next();
    };
  }
}
```

---

## 9. Собираем всё вместе

### Файловая структура:

```
router/
├── index.ts              ← export { Router } from "./router.ts"
├── router.ts             ← class Router
├── tree.ts               ← class RouteTree
├── node.ts               ← class Node, NodeTypes
├── handler-storage.ts    ← class HandlerStorage
├── compose.ts            ← function compose()
├── types/
│   ├── index.ts          ← Methods, Handler, Middleware, Next, ParamsType
│   ├── context.d.ts      ← declare global { interface Context }
│   └── status.ts         ← StatusBodyMap, StatusCode
└── index.test.ts         ← тесты от ментора
```

### Порядок реализации (рекомендуемый):

1. **types/** — просто определи типы
2. **handler-storage.ts** — Map-обёртка, 20 строк
3. **node.ts** — структура данных, 15 строк
4. **tree.ts** — основная сложность! Начни с insert без split, потом добавь split, потом search
5. **compose.ts** — 20 строк, но критически важно понять
6. **router.ts** — координация: use, get/post/patch/delete, handle, nest
7. **Zod-валидация** — добавь после того как основные тесты пройдут

### Запуск тестов:

```bash
# Скопируй тесты ментора из 2.oop-structures/practice/router-2/index.test.ts
# Подправь import пути
# Запускай:
npx vitest run router/index.test.ts

# Или в watch-режиме:
npx vitest watch router/index.test.ts
```

### Совет по отладке:

Добавь `prettyPrint()` в RouteTree и вызывай после insert'ов — визуально видеть дерево крайне полезно:

```typescript
prettyPrint(): void {
  this._print(this.root, "", true);
}

private _print(node: Node, prefix: string, isLast: boolean): void {
  const connector = isLast ? "└── " : "├── ";
  const label = node.path || "(root)";
  const methods = node.handlerStorage.getAllowedMethods();
  const methodStr = methods.length ? ` [${methods.join(", ")}]` : "";

  console.log(prefix + connector + label + methodStr);

  const childPrefix = prefix + (isLast ? "    " : "│   ");
  node.children.forEach((child, i) => {
    this._print(child, childPrefix, i === node.children.length - 1);
  });
}
```

---

## Частые ошибки и как их избежать

### 1. Забыл snapshot middleware

**Симптом**: middleware добавленная после `.get()` всё равно срабатывает для этого маршрута.

**Причина**: ты добавляешь middleware в общий массив и ссылаешься на него, а не копируешь.

**Фикс**: `const snapshot = [...this.currentMiddleware]` — копируй через spread.

### 2. Контекст шарится между запросами

**Симптом**: параллельные запросы перезаписывают данные друг друга.

**Причина**: один объект ctx используется для всех запросов.

**Фикс**: создавай новый `ctx = { req, res, params, query }` в каждом `handle()`.

### 3. Radix tree не матчит `/testing` когда есть `/test`

**Симптом**: `/testing` не находится, или наоборот `/test` матчит `/testing`.

**Причина**: при search проверяется `path.startsWith(child.path)`, но не проверяется что после child.path идёт `/` или конец строки.

**Фикс**: Radix tree по определению проверяет весь `child.path` как префикс. Если `child.path = "test"` и `path = "testing"`, то `startsWith` вернёт true, остаток `"ing"` пойдёт в рекурсию. Если нет потомка для "ing" — вернётся null. Это правильное поведение! Проблема скорее в insert — убедись что split работает верно.

### 4. Parametric параметр захватывает слэш

**Симптом**: `:id` в `/users/:id` захватывает `"42/posts"` вместо `"42"`.

**Причина**: не ищешь `/` при извлечении значения параметра.

**Фикс**: `const slashIdx = path.indexOf("/"); const value = slashIdx === -1 ? path : path.slice(0, slashIdx);`

### 5. Onion model не работает — "after" код не выполняется

**Симптом**: `await next()` не ждёт завершения нижестоящих middleware.

**Причина**: compose не оборачивает в Promise.resolve(), или dispatch не возвращает Promise.

**Фикс**: убедись что `dispatch` всегда возвращает Promise, и middleware-результат оборачивается в `Promise.resolve(fn(...))`.
