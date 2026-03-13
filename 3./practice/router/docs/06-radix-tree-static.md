# Radix Tree: только статические маршруты

> Цель этого гайда — научиться строить radix tree **без параметров и wildcard**.
> Только строки, только split, только хардкор.
>
> Когда дерево будет работать идеально со статикой — добавить `:param` и `*` будет
> простым расширением, а не нагромождением.
>
> **Правило**: не думай о параметрах. Их не существует. Есть только строки.

---

## Оглавление

- [Как пользоваться](#как-пользоваться)
- [Существующие типы и классы](#существующие-типы-и-классы)
- [Итерация 1: Node — структура данных](#итерация-1-node--структура-данных)
- [Итерация 2: Insert — один путь](#итерация-2-insert--один-путь)
- [Итерация 3: Insert — общий префикс и split](#итерация-3-insert--общий-префикс-и-split)
- [Итерация 4: Search — точный поиск](#итерация-4-search--точный-поиск)
- [Итерация 5: Много путей + edge cases](#итерация-5-много-путей--edge-cases)
- [Итерация 6: prettyPrint](#итерация-6-prettyprint)
- [Итерация 7: Интеграция с Router](#итерация-7-интеграция-с-router)
- [Шпаргалка](#шпаргалка)

---

## Как пользоваться

1. Создай файл `router/radix.ts` — в нём будет `Node` и `RadixTree`
2. Создай файл `router/radix.test.ts` — копируй тесты текущей итерации
3. Запускай: `npx vitest run router/radix.test.ts`
4. Когда все тесты зелёные — переходи к следующей итерации

---

## Существующие типы и классы

У тебя уже есть всё необходимое — **используй это с первой итерации**, не дублируй:

**`types/index.ts`** — типы:
```typescript
type Methods = "DELETE" | "GET" | "PATCH" | "POST" | "PUT";
type Next = () => Promise<void> | void;
type Handler = (ctx: Context, next: Next) => Promise<void> | void;
type Middleware = Handler;  // одно и то же
```

**`handler-storage.ts`** — хранилище handler'ов по HTTP-методам:
```typescript
class HandlerStorage {
  handlers: Map<Methods, Handler>;
  addHandler(method: Methods, handler: Handler): void;
  getHandler(method: Methods): Handler | null;
  getMethods(): Methods[];
  hasHandlers(method: Methods): boolean;
}
```

**`types/context.d.ts`** — глобальные интерфейсы `Request`, `Response`, `Context`:
```typescript
interface Request { body: unknown; headers: Record<string, string>; method: Methods; url: string; query?: Record<string, string>; }
interface Response { status<S extends RequestStatusType>(code: S): { return(body: StatusBodyMap[S]): void; }; }
interface Context { req: Request; res: Response; }
```

**`compose.ts`** — compose для middleware-цепочек (уже реализован).

---

## Итерация 1: Node — структура данных

**Идея**: прежде чем строить дерево, нужна нода. Radix tree node хранит:
- `path` — кусок строки (не обязательно полный сегмент! может быть `"te"`, `"st"`, `"ing"`)
- `children` — дочерние ноды
- `handlerStorage` — `HandlerStorage` для хранения handler'ов по методам

Вот ключевое отличие от обычного trie: в radix tree нода хранит **подстроку**, а не один символ.

```
Обычный trie:         Radix tree:
  t                     test
  └── e                   └── ing
      └── s
          └── t
              └── i
                  └── n
                      └── g
```

**Что нужно реализовать**:
- Класс `Node` с полями `path`, `children`, `handlerStorage`
- Класс `RadixTree` с полем `root` (пустая нода)

```typescript
// radix.test.ts
import { Node, RadixTree } from "./radix.ts";

describe("Iter 1: Node", () => {
  it("Node создаётся с path", () => {
    const node = new Node("test");

    expect(node.path).toBe("test");
    expect(node.children).toEqual([]);
  });

  it("Node имеет HandlerStorage", () => {
    const node = new Node("test");

    expect(node.handlerStorage).toBeDefined();
    expect(node.handlerStorage.getMethods()).toEqual([]);
  });

  it("Node может хранить handler через HandlerStorage", () => {
    const fn = vi.fn();
    const node = new Node("test");
    node.handlerStorage.addHandler("GET", fn);

    expect(node.handlerStorage.getHandler("GET")).toBe(fn);
    expect(node.handlerStorage.getHandler("POST")).toBeNull();
  });

  it("RadixTree создаётся с пустым корнем", () => {
    const tree = new RadixTree();

    expect(tree.root).toBeInstanceOf(Node);
    expect(tree.root.path).toBe("");
    expect(tree.root.children).toEqual([]);
  });
});
```

<details>
<summary>Подсказка</summary>

```typescript
import { HandlerStorage } from "./handler-storage.ts";

export class Node {
  children: Node[] = [];
  handlerStorage = new HandlerStorage();

  constructor(public path: string) {}
}

export class RadixTree {
  root = new Node("");
}
```

Буквально 10 строк. `HandlerStorage` на каждой ноде — пустой storage ничего не весит,
зато не нужно проверять на null.
</details>

---

## Итерация 2: Insert — один путь

**Идея**: научить дерево вставлять маршрут. Начнём с самого простого — вставка одного пути
в пустое дерево. Путь всегда начинается с `/`.

**Сигнатура**: `insert(method: Methods, path: string, handler: Handler)` — с самого начала
принимает HTTP-метод, потому что `HandlerStorage` работает с методами.

Алгоритм insert:
1. Убери ведущий `/` (root и так представляет корень)
2. Если у текущей ноды нет children — создай child с полным оставшимся путём
3. Запиши handler на конечную ноду через `handlerStorage.addHandler(method, handler)`

```
insert("GET", "/users", h) →   root("")
                                  └── "users" [GET: h]

insert("GET", "/", h)      →   root("") [GET: h]
```

**Тесты**:

```typescript
describe("Iter 2: insert — один путь", () => {
  it("insert в пустое дерево создаёт один child", () => {
    const tree = new RadixTree();
    const handler = vi.fn();

    tree.insert("GET", "/users", handler);

    expect(tree.root.children).toHaveLength(1);
    expect(tree.root.children[0].path).toBe("users");
    expect(tree.root.children[0].handlerStorage.getHandler("GET")).toBe(handler);
  });

  it("insert корневого пути / ставит handler на root", () => {
    const tree = new RadixTree();
    const handler = vi.fn();

    tree.insert("GET", "/", handler);

    expect(tree.root.handlerStorage.getHandler("GET")).toBe(handler);
    expect(tree.root.children).toHaveLength(0);
  });

  it("insert длинного пути создаёт один child (не разбивает по /)", () => {
    const tree = new RadixTree();
    const handler = vi.fn();

    tree.insert("GET", "/api/v1/users", handler);

    // В radix tree это ОДНА нода с path "api/v1/users"
    // потому что нет других путей, с которыми нужно делить префикс
    expect(tree.root.children).toHaveLength(1);
    expect(tree.root.children[0].path).toBe("api/v1/users");
    expect(tree.root.children[0].handlerStorage.getHandler("GET")).toBe(handler);
  });

  it("два разных пути без общего префикса — два child'а", () => {
    const tree = new RadixTree();
    const a = vi.fn();
    const b = vi.fn();

    tree.insert("GET", "/users", a);
    tree.insert("GET", "/items", b);

    expect(tree.root.children).toHaveLength(2);

    const paths = tree.root.children.map((c) => c.path).sort();
    expect(paths).toEqual(["items", "users"]);
  });

  it("GET и POST на одном пути — оба сохраняются", () => {
    const tree = new RadixTree();
    const get = vi.fn();
    const post = vi.fn();

    tree.insert("GET", "/users", get);
    tree.insert("POST", "/users", post);

    expect(tree.root.children).toHaveLength(1);
    expect(tree.root.children[0].handlerStorage.getHandler("GET")).toBe(get);
    expect(tree.root.children[0].handlerStorage.getHandler("POST")).toBe(post);
  });
});
```

<details>
<summary>Подсказка</summary>

```
insert(method, path, handler) {
  const p = path === "/" ? "" : path.slice(1); // убрать ведущий /

  if (p === "") {
    this.root.handlerStorage.addHandler(method, handler);
    return;
  }

  // Пока что без split — просто ищем child с общим префиксом
  // Если не нашли — создаём новый child
  this._insert(this.root, method, p, handler);
}

_insert(node, method, path, handler) {
  // Пройдись по children:
  //   если child.path === path — повесь handler через handlerStorage.addHandler()
  //   если общий префикс — будет в след. итерации
  //   если ничего не нашёл — new Node(path) с handler, push в children
}
```

На этом этапе `_insert` может быть очень простой — без split.
Два пути без общего префикса просто создают два отдельных child'а.
</details>

---

## Итерация 3: Insert — общий префикс и split

**Идея**: это сердце radix tree. Когда два пути имеют общий префикс, ноду нужно **разрезать**.

Пример: вставили `/test`, потом `/testing`.

```
После insert("GET", "/test", h1):   После insert("GET", "/testing", h2):
  root("")                             root("")
    └── "test" [GET: h1]                └── "test" [GET: h1]
                                               └── "ing" [GET: h2]
```

Ещё пример: вставили `/testing`, потом `/test`.

```
После insert("GET", "/testing", h1):   После insert("GET", "/test", h2):
  root("")                                root("")
    └── "testing" [GET: h1]                 └── "test" [GET: h2]
                                                  └── "ing" [GET: h1]
```

А вот `/test` и `/team`:

```
  root("")
    └── "te"            ← промежуточная нода, handlerStorage пустой
          ├── "st" [GET: h1]
          └── "am" [GET: h2]
```

**Алгоритм split**:
1. Найди общий префикс между `child.path` и вставляемым `path`
2. Если префикс === child.path → иди глубже с остатком пути
3. Если префикс < child.path → разрежь child на две ноды
4. Если общего префикса нет — пропусти этот child

**Как разрезать ноду** (это ВАЖНО, нарисуй на бумаге):
```
Было: child = Node("testing", handlerStorage={GET: H}, children=[...])
Общий префикс с "team" = "te" (длина 2)

Шаг 1: создай suffix = Node("sting")
        suffix.handlerStorage = child.handlerStorage  ← перенеси ВЕСЬ storage!
        suffix.children = child.children
Шаг 2: обрежь child.path = "te"
        child.handlerStorage = new HandlerStorage()   ← чистый, пустой
        child.children = [suffix]
Шаг 3: теперь вставь остаток "am" как ещё один child ноды "te"

Стало:
  "te" (пустой storage)
    ├── "sting" [GET: H]   ← бывший "testing"
    └── "am" [GET: H2]     ← новый
```

**Тесты**:

```typescript
describe("Iter 3: insert — split", () => {
  it("/test + /testing → split", () => {
    const tree = new RadixTree();
    const a = vi.fn();
    const b = vi.fn();

    tree.insert("GET", "/test", a);
    tree.insert("GET", "/testing", b);

    // root → "test"[GET: a] → "ing"[GET: b]
    expect(tree.root.children).toHaveLength(1);

    const testNode = tree.root.children[0];
    expect(testNode.path).toBe("test");
    expect(testNode.handlerStorage.getHandler("GET")).toBe(a);
    expect(testNode.children).toHaveLength(1);

    const ingNode = testNode.children[0];
    expect(ingNode.path).toBe("ing");
    expect(ingNode.handlerStorage.getHandler("GET")).toBe(b);
  });

  it("/testing + /test → split (обратный порядок)", () => {
    const tree = new RadixTree();
    const a = vi.fn();
    const b = vi.fn();

    tree.insert("GET", "/testing", a);
    tree.insert("GET", "/test", b);

    // root → "test"[GET: b] → "ing"[GET: a]
    const testNode = tree.root.children[0];
    expect(testNode.path).toBe("test");
    expect(testNode.handlerStorage.getHandler("GET")).toBe(b);

    const ingNode = testNode.children[0];
    expect(ingNode.path).toBe("ing");
    expect(ingNode.handlerStorage.getHandler("GET")).toBe(a);
  });

  it("/test + /team → split по общему префиксу 'te'", () => {
    const tree = new RadixTree();
    const a = vi.fn();
    const b = vi.fn();

    tree.insert("GET", "/test", a);
    tree.insert("GET", "/team", b);

    // root → "te"(пустой) → "st"[GET: a], "am"[GET: b]
    const teNode = tree.root.children[0];
    expect(teNode.path).toBe("te");
    expect(teNode.handlerStorage.getMethods()).toEqual([]);
    expect(teNode.children).toHaveLength(2);

    const paths = teNode.children.map((c) => c.path).sort();
    expect(paths).toEqual(["am", "st"]);
  });

  it("три пути с общим префиксом", () => {
    const tree = new RadixTree();

    tree.insert("GET", "/test", vi.fn());
    tree.insert("GET", "/testing", vi.fn());
    tree.insert("GET", "/team", vi.fn());

    // root → "te"(пустой)
    //           ├── "st"[H] → "ing"[H]
    //           └── "am"[H]
    const teNode = tree.root.children[0];
    expect(teNode.path).toBe("te");
    expect(teNode.children).toHaveLength(2);
  });

  it("/api/users + /api/items → split по 'api/'", () => {
    const tree = new RadixTree();
    const a = vi.fn();
    const b = vi.fn();

    tree.insert("GET", "/api/users", a);
    tree.insert("GET", "/api/items", b);

    // root → "api/"(пустой) → "users"[GET: a], "items"[GET: b]
    const apiNode = tree.root.children[0];
    expect(apiNode.path).toBe("api/");
    expect(apiNode.handlerStorage.getMethods()).toEqual([]);
    expect(apiNode.children).toHaveLength(2);
  });

  it("вставка одного пути дважды с одним методом — перезаписывает handler", () => {
    const tree = new RadixTree();
    const first = vi.fn();
    const second = vi.fn();

    tree.insert("GET", "/test", first);
    tree.insert("GET", "/test", second);

    const testNode = tree.root.children[0];
    expect(testNode.handlerStorage.getHandler("GET")).toBe(second);
    expect(testNode.children).toHaveLength(0);
  });

  it("split не теряет handler'ы разных методов", () => {
    const tree = new RadixTree();
    const getTest = vi.fn();
    const postTest = vi.fn();
    const getTeam = vi.fn();

    tree.insert("GET", "/test", getTest);
    tree.insert("POST", "/test", postTest);
    tree.insert("GET", "/team", getTeam);

    // split "test" → "te" + "st"
    // "st" должна сохранить и GET, и POST handler'ы
    const teNode = tree.root.children[0];
    const stNode = teNode.children.find((c) => c.path === "st")!;

    expect(stNode.handlerStorage.getHandler("GET")).toBe(getTest);
    expect(stNode.handlerStorage.getHandler("POST")).toBe(postTest);
  });

  it("insert не ломает существующие handler'ы", () => {
    const tree = new RadixTree();
    const a = vi.fn();
    const b = vi.fn();
    const c = vi.fn();

    tree.insert("GET", "/users", a);
    tree.insert("GET", "/users/list", b);
    tree.insert("GET", "/users/login", c);

    // root → "users"[GET: a] → ... → "list"[GET: b], "login"[GET: c]
    const usersNode = tree.root.children[0];
    expect(usersNode.path).toBe("users");
    expect(usersNode.handlerStorage.getHandler("GET")).toBe(a);
  });
});
```

<details>
<summary>Подсказка: findCommonPrefix</summary>

```typescript
function findCommonPrefix(a: string, b: string): string {
  let i = 0;
  const min = Math.min(a.length, b.length);
  while (i < min && a[i] === b[i]) {
    i++;
  }
  return a.slice(0, i);
}
```

Эта функция — ключ ко всему. Она возвращает общее начало двух строк.
`findCommonPrefix("testing", "team")` → `"te"`
</details>

<details>
<summary>Подсказка: splitNode</summary>

```typescript
// child.path = "testing", нужно разрезать на позиции 4 ("test" | "ing")
splitNode(child: Node, splitAt: number) {
  const suffix = new Node(child.path.slice(splitAt));
  suffix.handlerStorage = child.handlerStorage;  // переносим ВЕСЬ storage
  suffix.children = child.children;

  child.path = child.path.slice(0, splitAt);
  child.handlerStorage = new HandlerStorage();   // чистый, пустой
  child.children = [suffix];
}
```
</details>

<details>
<summary>Подсказка: полный алгоритм _insert</summary>

```
_insert(node, method, path, handler):
  for each child in node.children:
    prefix = findCommonPrefix(child.path, path)

    if prefix === "":
      continue  // нет общего — пропускаем

    if prefix === child.path AND prefix === path:
      // точное совпадение — добавляем handler в storage
      child.handlerStorage.addHandler(method, handler)
      return

    if prefix === child.path:
      // child.path полностью входит в path
      // идём глубже с остатком
      _insert(child, method, path.slice(prefix.length), handler)
      return

    if prefix.length < child.path.length:
      // частичное совпадение — нужен split
      splitNode(child, prefix.length)

      if prefix === path:
        // вставляемый путь = prefix, handler ставим на разрезанную ноду
        child.handlerStorage.addHandler(method, handler)
      else:
        // нужно ещё вставить остаток
        _insert(child, method, path.slice(prefix.length), handler)
      return

  // ни один child не подошёл — создаём новый
  newNode = new Node(path)
  newNode.handlerStorage.addHandler(method, handler)
  node.children.push(newNode)
```

Обрати внимание: в каждой ветке стоит `return`. Как только нашли подходящий child — работаем с ним и выходим.
</details>

---

## Итерация 4: Search — точный поиск

**Идея**: теперь нужно уметь искать handler по пути. Алгоритм search зеркалит insert,
но проще — не нужен split, только спуск по дереву.

**Сигнатура**: `search(method: Methods, path: string): Handler | null`

Алгоритм:
1. Убери ведущий `/`
2. Ищи child, чей `path` является **префиксом** текущего пути
3. Отрежь этот префикс и иди глубже
4. Когда путь пуст — верни `handlerStorage.getHandler(method)` (или null)

```
Дерево:
  root → "te" → "st"[GET: H1] → "ing"[GET: H2]
              → "am"[GET: H3]

search("GET", "/test"):    "te" match → "st" match → path пуст → H1 ✓
search("GET", "/testing"): "te" match → "st" match → "ing" match → path пуст → H2 ✓
search("GET", "/team"):    "te" match → "am" match → path пуст → H3 ✓
search("GET", "/tea"):     "te" match → нет child "a" → null ✗
search("POST", "/test"):   "te" match → "st" match → path пуст → storage.getHandler("POST") → null ✗
```

**Тесты**:

```typescript
describe("Iter 4: search", () => {
  it("находит вставленный маршрут", () => {
    const tree = new RadixTree();
    const handler = vi.fn();

    tree.insert("GET", "/users", handler);
    const result = tree.search("GET", "/users");

    expect(result).toBe(handler);
  });

  it("возвращает null для несуществующего маршрута", () => {
    const tree = new RadixTree();
    tree.insert("GET", "/users", vi.fn());

    expect(tree.search("GET", "/items")).toBeNull();
  });

  it("возвращает null для неправильного метода", () => {
    const tree = new RadixTree();
    tree.insert("GET", "/users", vi.fn());

    expect(tree.search("POST", "/users")).toBeNull();
    expect(tree.search("DELETE", "/users")).toBeNull();
  });

  it("находит корневой маршрут /", () => {
    const tree = new RadixTree();
    const handler = vi.fn();

    tree.insert("GET", "/", handler);

    expect(tree.search("GET", "/")).toBe(handler);
  });

  it("не матчит частичный путь (суффикс отсутствует)", () => {
    const tree = new RadixTree();
    tree.insert("GET", "/testing", vi.fn());

    expect(tree.search("GET", "/test")).toBeNull();
  });

  it("не матчит слишком длинный путь", () => {
    const tree = new RadixTree();
    tree.insert("GET", "/test", vi.fn());

    expect(tree.search("GET", "/testing")).toBeNull();
  });

  it("находит маршруты после split", () => {
    const tree = new RadixTree();
    const a = vi.fn();
    const b = vi.fn();

    tree.insert("GET", "/test", a);
    tree.insert("GET", "/team", b);

    expect(tree.search("GET", "/test")).toBe(a);
    expect(tree.search("GET", "/team")).toBe(b);
  });

  it("не матчит промежуточную ноду без handler'а", () => {
    const tree = new RadixTree();
    tree.insert("GET", "/test", vi.fn());
    tree.insert("GET", "/team", vi.fn());

    // "te" — промежуточная нода, handlerStorage пустой
    expect(tree.search("GET", "/te")).toBeNull();
  });

  it("GET и POST на одном пути — независимы", () => {
    const tree = new RadixTree();
    const get = vi.fn();
    const post = vi.fn();

    tree.insert("GET", "/users", get);
    tree.insert("POST", "/users", post);

    expect(tree.search("GET", "/users")).toBe(get);
    expect(tree.search("POST", "/users")).toBe(post);
    expect(tree.search("DELETE", "/users")).toBeNull();
  });

  it("все 5 методов на одном пути", () => {
    const tree = new RadixTree();
    const methods = ["GET", "POST", "PUT", "PATCH", "DELETE"] as const;
    const handlers: Record<string, ReturnType<typeof vi.fn>> = {};

    for (const m of methods) {
      handlers[m] = vi.fn();
      tree.insert(m, "/resource", handlers[m]);
    }

    for (const m of methods) {
      expect(tree.search(m, "/resource")).toBe(handlers[m]);
    }
  });

  it("находит длинные пути", () => {
    const tree = new RadixTree();
    const handler = vi.fn();

    tree.insert("GET", "/api/v1/users/list", handler);

    expect(tree.search("GET", "/api/v1/users/list")).toBe(handler);
  });

  it("находит все маршруты в дереве из нескольких путей", () => {
    const tree = new RadixTree();
    const handlers = {
      users: vi.fn(),
      usersMe: vi.fn(),
      items: vi.fn(),
      itemsList: vi.fn(),
    };

    tree.insert("GET", "/users", handlers.users);
    tree.insert("GET", "/users/me", handlers.usersMe);
    tree.insert("GET", "/items", handlers.items);
    tree.insert("GET", "/items/list", handlers.itemsList);

    expect(tree.search("GET", "/users")).toBe(handlers.users);
    expect(tree.search("GET", "/users/me")).toBe(handlers.usersMe);
    expect(tree.search("GET", "/items")).toBe(handlers.items);
    expect(tree.search("GET", "/items/list")).toBe(handlers.itemsList);

    expect(tree.search("GET", "/users/other")).toBeNull();
    expect(tree.search("GET", "/unknown")).toBeNull();
  });
});
```

<details>
<summary>Подсказка</summary>

```
search(method, fullPath):
  path = fullPath === "/" ? "" : fullPath.slice(1)

  if path === "":
    return this.root.handlerStorage.getHandler(method)

  return this._search(this.root, method, path)

_search(node, method, path):
  for each child in node.children:
    if path.startsWith(child.path):
      remaining = path.slice(child.path.length)

      if remaining === "":
        return child.handlerStorage.getHandler(method)  // может быть null!

      return _search(child, method, remaining)

  return null   // ни один child не подошёл
```

Ключевой момент: `path.startsWith(child.path)` — мы проверяем что путь **начинается** с child.path. Не наоборот!
</details>

---

## Итерация 5: Много путей + edge cases

**Идея**: убедиться, что дерево работает со сложными комбинациями путей.
Тут нет нового кода — только тесты, которые ловят баги.

```typescript
describe("Iter 5: edge cases", () => {
  it("trailing slash — разные маршруты", () => {
    const tree = new RadixTree();
    const a = vi.fn();
    const b = vi.fn();

    tree.insert("GET", "/users", a);
    tree.insert("GET", "/users/", b);

    expect(tree.search("GET", "/users")).toBe(a);
    expect(tree.search("GET", "/users/")).toBe(b);
  });

  it("длинная цепочка split'ов (Wikipedia example)", () => {
    const tree = new RadixTree();
    const handlers: Record<string, ReturnType<typeof vi.fn>> = {};

    const paths = ["/romane", "/romanus", "/romulus", "/rubens", "/ruber", "/rubicon", "/rubicundus"];
    for (const p of paths) {
      handlers[p] = vi.fn();
      tree.insert("GET", p, handlers[p]);
    }

    for (const p of paths) {
      expect(tree.search("GET", p)).toBe(handlers[p]);
    }

    // Не должны матчить частичные
    expect(tree.search("GET", "/rom")).toBeNull();
    expect(tree.search("GET", "/rub")).toBeNull();
    expect(tree.search("GET", "/roman")).toBeNull();
  });

  it("путь — подстрока другого пути (с /)", () => {
    const tree = new RadixTree();
    const a = vi.fn();
    const b = vi.fn();
    const c = vi.fn();

    tree.insert("GET", "/a", a);
    tree.insert("GET", "/a/b", b);
    tree.insert("GET", "/a/b/c", c);

    expect(tree.search("GET", "/a")).toBe(a);
    expect(tree.search("GET", "/a/b")).toBe(b);
    expect(tree.search("GET", "/a/b/c")).toBe(c);
    expect(tree.search("GET", "/a/b/c/d")).toBeNull();
  });

  it("общие префиксы с / на разных позициях", () => {
    const tree = new RadixTree();
    const h1 = vi.fn();
    const h2 = vi.fn();
    const h3 = vi.fn();

    tree.insert("GET", "/api/users", h1);
    tree.insert("GET", "/api/items", h2);
    tree.insert("GET", "/app/config", h3);

    expect(tree.search("GET", "/api/users")).toBe(h1);
    expect(tree.search("GET", "/api/items")).toBe(h2);
    expect(tree.search("GET", "/app/config")).toBe(h3);
    expect(tree.search("GET", "/api")).toBeNull();
    expect(tree.search("GET", "/app")).toBeNull();
  });

  it("разные HTTP-методы на путях с общим префиксом после split", () => {
    const tree = new RadixTree();
    const getUsers = vi.fn();
    const postUsers = vi.fn();
    const getItems = vi.fn();

    tree.insert("GET", "/api/users", getUsers);
    tree.insert("POST", "/api/users", postUsers);
    tree.insert("GET", "/api/items", getItems);

    expect(tree.search("GET", "/api/users")).toBe(getUsers);
    expect(tree.search("POST", "/api/users")).toBe(postUsers);
    expect(tree.search("GET", "/api/items")).toBe(getItems);
    expect(tree.search("POST", "/api/items")).toBeNull();
  });

  it("20 маршрутов — все находятся", () => {
    const tree = new RadixTree();
    const handlers: Record<string, ReturnType<typeof vi.fn>> = {};

    const paths = [
      "/", "/users", "/users/list", "/users/create",
      "/items", "/items/list", "/items/create",
      "/api/v1/health", "/api/v1/users", "/api/v1/items",
      "/api/v2/health", "/api/v2/users", "/api/v2/items",
      "/auth/login", "/auth/logout", "/auth/refresh",
      "/docs", "/docs/api", "/docs/guides", "/docs/faq",
    ];

    for (const p of paths) {
      handlers[p] = vi.fn();
      tree.insert("GET", p, handlers[p]);
    }

    for (const p of paths) {
      const found = tree.search("GET", p);
      expect(found).toBe(handlers[p]);
    }
  });

  it("insert после search не ломает дерево", () => {
    const tree = new RadixTree();
    const a = vi.fn();
    const b = vi.fn();

    tree.insert("GET", "/test", a);
    expect(tree.search("GET", "/test")).toBe(a);

    tree.insert("GET", "/testing", b);
    expect(tree.search("GET", "/test")).toBe(a);
    expect(tree.search("GET", "/testing")).toBe(b);
  });
});
```

<details>
<summary>Подсказка: классический пример из Wikipedia</summary>

Пути `romane, romanus, romulus, rubens, ruber, rubicon, rubicundus` — это
классический пример radix tree из Википедии. Если твоё дерево их корректно
вставляет и находит — алгоритм работает правильно.

Дерево должно выглядеть примерно так:
```
root
  └── "r"
       ├── "om"
       │     ├── "an"
       │     │     ├── "e" [H]
       │     │     └── "us" [H]
       │     └── "ulus" [H]
       └── "ub"
             ├── "e"
             │     ├── "ns" [H]
             │     └── "r" [H]
             └── "ic"
                   ├── "on" [H]
                   └── "undus" [H]
```
</details>

---

## Итерация 6: prettyPrint

**Идея**: для отладки нужно уметь визуализировать дерево. `prettyPrint()` должен
показывать структуру нод с отступами. Используй `handlerStorage.getMethods()`
чтобы показать какие HTTP-методы зарегистрированы на ноде.

Ожидаемый формат:
```
root
├── api/
│   ├── users (GET, POST)
│   └── items (GET)
├── auth/
│   ├── login (POST)
│   └── logout (POST)
└── docs (GET)
```

```typescript
describe("Iter 6: prettyPrint", () => {
  it("пустое дерево", () => {
    const tree = new RadixTree();
    const output = tree.prettyPrint();

    expect(output).toBe("root");
  });

  it("один маршрут", () => {
    const tree = new RadixTree();
    tree.insert("GET", "/users", vi.fn());

    const output = tree.prettyPrint();

    expect(output).toContain("users");
    expect(output).toContain("GET");
  });

  it("два маршрута с общим префиксом", () => {
    const tree = new RadixTree();
    tree.insert("GET", "/test", vi.fn());
    tree.insert("GET", "/team", vi.fn());

    const output = tree.prettyPrint();

    // Должно содержать промежуточный "te" и дочерние "st", "am"
    expect(output).toContain("te");
    expect(output).toContain("st");
    expect(output).toContain("am");
  });

  it("показывает методы у нод с handler'ами (через HandlerStorage)", () => {
    const tree = new RadixTree();
    tree.insert("GET", "/users", vi.fn());
    tree.insert("POST", "/users", vi.fn());

    const output = tree.prettyPrint();

    expect(output).toContain("GET");
    expect(output).toContain("POST");
  });

  it("snapshot структуры дерева", () => {
    const tree = new RadixTree();
    tree.insert("GET", "/test", vi.fn());
    tree.insert("GET", "/testing", vi.fn());
    tree.insert("POST", "/test", vi.fn());
    tree.insert("GET", "/team", vi.fn());

    const output = tree.prettyPrint();

    // Проверяем что вывод — многострочная строка с нужными кусками
    const lines = output.split("\n");
    expect(lines.length).toBeGreaterThanOrEqual(4);
  });
});
```

<details>
<summary>Подсказка</summary>

```typescript
prettyPrint(): string {
  const lines: string[] = ["root"];
  this._print(this.root.children, "", lines);
  return lines.join("\n");
}

_print(children: Node[], indent: string, lines: string[]): void {
  children.forEach((child, i) => {
    const isLast = i === children.length - 1;
    const connector = isLast ? "└── " : "├── ";
    const methods = child.handlerStorage.getMethods();
    const suffix = methods.length ? ` (${methods.join(", ")})` : "";

    lines.push(indent + connector + child.path + suffix);

    const nextIndent = indent + (isLast ? "    " : "│   ");
    this._print(child.children, nextIndent, lines);
  });
}
```
</details>

---

## Итерация 7: Интеграция с Router

**Идея**: заменить `Map<string, Handler>` в Router на `RadixTree`. Теперь Router
использует дерево для хранения и поиска маршрутов. Compose и middleware — без изменений.

Типы `Handler`, `Middleware`, `Methods` — из `types/index.ts`.
`compose` — из `compose.ts`.

**Что нужно сделать**:
1. `addRoute(method: Methods, path: string, handler: Handler)` → snapshot middleware, compose, `this.tree.insert(method, path, composedFn)`
2. `handle(req: Request, res: Response)` → `this.tree.search(req.method, path)` → создать ctx → вызвать handler

```typescript
describe("Iter 7: Router + RadixTree", () => {
  // import { Router } from "./radix.ts" (или из нового файла)

  it("простой маршрут работает через дерево", async () => {
    const handler = vi.fn();
    const router = new Router();
    router.get("/users", handler);

    await router.handle({ method: "GET", url: "/users" }, {});

    expect(handler).toHaveBeenCalledOnce();
  });

  it("маршруты с общим префиксом оба работают", async () => {
    const calls: string[] = [];

    const router = new Router()
      .get("/test", () => calls.push("test"))
      .get("/testing", () => calls.push("testing"))
      .get("/team", () => calls.push("team"));

    await router.handle({ method: "GET", url: "/test" }, {});
    await router.handle({ method: "GET", url: "/testing" }, {});
    await router.handle({ method: "GET", url: "/team" }, {});

    expect(calls).toEqual(["test", "testing", "team"]);
  });

  it("middleware + tree", async () => {
    const order: string[] = [];

    const router = new Router()
      .use((_: any, next: any) => { order.push("mw"); next(); })
      .get("/api/users", () => order.push("users"))
      .get("/api/items", () => order.push("items"));

    await router.handle({ method: "GET", url: "/api/users" }, {});
    await router.handle({ method: "GET", url: "/api/items" }, {});

    expect(order).toEqual(["mw", "users", "mw", "items"]);
  });

  it("snapshot семантика сохраняется с tree", async () => {
    const order: string[] = [];

    const router = new Router()
      .get("/first", () => order.push("first"))
      .use((_: any, next: any) => { order.push("mw"); next(); })
      .get("/second", () => order.push("second"));

    await router.handle({ method: "GET", url: "/first" }, {});
    await router.handle({ method: "GET", url: "/second" }, {});

    expect(order).toEqual(["first", "mw", "second"]);
  });

  it("query string парсится, поиск по path без query", async () => {
    let query: any;

    const router = new Router()
      .get("/search", (ctx: any) => { query = ctx.req.query; });

    await router.handle({ method: "GET", url: "/search?q=hello&page=1" }, {});

    expect(query).toEqual({ q: "hello", page: "1" });
  });

  it("GET и POST на одном пути — независимы", async () => {
    const calls: string[] = [];

    const router = new Router()
      .get("/items", () => calls.push("get"))
      .post("/items", () => calls.push("post"));

    await router.handle({ method: "GET", url: "/items" }, {});
    await router.handle({ method: "POST", url: "/items" }, {});

    expect(calls).toEqual(["get", "post"]);
  });

  it("несуществующий путь — не падает", async () => {
    const router = new Router().get("/exists", vi.fn());

    // Не должен бросить ошибку
    await router.handle({ method: "GET", url: "/nope" }, {});
  });

  it("onion model работает через дерево", async () => {
    const order: string[] = [];

    const router = new Router()
      .use(async (_: any, next: any) => {
        order.push("before");
        await next();
        order.push("after");
      })
      .get("/test", () => order.push("handler"));

    await router.handle({ method: "GET", url: "/test" }, {});

    expect(order).toEqual(["before", "handler", "after"]);
  });

  it("prettyPrint показывает структуру", () => {
    const router = new Router()
      .get("/api/users", vi.fn())
      .post("/api/users", vi.fn())
      .get("/api/items", vi.fn())
      .get("/health", vi.fn());

    const output = router.prettyPrint();

    expect(output).toContain("api/");
    expect(output).toContain("health");
    expect(output).toContain("GET");
  });
});
```

<details>
<summary>Подсказка</summary>

Изменения в Router минимальны:

```typescript
import { compose } from "./compose.ts";
import { Handler, Methods, Middleware } from "./types";
import { RadixTree } from "./radix.ts";
import { getPathWithoutQuery, getQuery, paramsToObject } from "./utils.ts";

class Router {
  private tree = new RadixTree();
  private middlewares: Middleware[] = [];

  addRoute(method: Methods, path: string, handler: Handler): this {
    const fn = compose([...this.middlewares, handler]);
    this.tree.insert(method, path, fn);
    return this;
  }

  async handle(req: any, res: any) {
    const path = getPathWithoutQuery(req.url);
    const handler = this.tree.search(req.method, path);

    if (!handler) return;

    const queryStr = getQuery(req.url);
    const query = paramsToObject(new URLSearchParams(queryStr).entries());
    const ctx = { req: { ...req, url: path, query }, res };

    await handler(ctx, async () => {});
  }

  prettyPrint(): string {
    return this.tree.prettyPrint();
  }

  // get, post, patch, delete, use — без изменений
}
```

Обрати внимание: используем `getPathWithoutQuery` и `getQuery` из `utils.ts` —
они у тебя уже есть. Вся сложность — в RadixTree. Router просто делегирует.
</details>

---

## Шпаргалка

| # | Что делаем | Строк кода | Сложность |
|---|---|---|---|
| 1 | Node + HandlerStorage | ~10 | Легко |
| 2 | Insert — один путь | ~25 | Легко |
| 3 | Insert — split (общий префикс) | ~40 | **Сложно** |
| 4 | Search — поиск по дереву | ~20 | Средне |
| 5 | Edge cases (только тесты) | 0 | Средне |
| 6 | prettyPrint | ~20 | Легко |
| 7 | Интеграция с Router | ~15 | Средне |

**Итого**: ~130 строк на полное radix tree со статикой.

### Что дальше

Когда этот гайд пройден, у тебя есть **работающее radix tree без параметров**.
Следующий шаг — добавить `:param` ноды. Это будет отдельный гайд, но ключевая идея:
- Параметрическая нода — это особый тип child'а
- При search: сначала проверяй static children (приоритет!), потом parametric
- Параметрическая нода "съедает" всё до следующего `/`

Но это — **потом**. Сначала пройди все 7 итераций здесь.
