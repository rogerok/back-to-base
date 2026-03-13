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
- [Итерация 1: Node — структура данных](#итерация-1-node--структура-данных)
- [Итерация 2: Insert — один путь](#итерация-2-insert--один-путь)
- [Итерация 3: Insert — общий префикс и split](#итерация-3-insert--общий-префикс-и-split)
- [Итерация 4: Search — точный поиск](#итерация-4-search--точный-поиск)
- [Итерация 5: Много путей + edge cases](#итерация-5-много-путей--edge-cases)
- [Итерация 6: HTTP-методы на одном пути](#итерация-6-http-методы-на-одном-пути)
- [Итерация 7: prettyPrint](#итерация-7-prettyprint)
- [Итерация 8: Интеграция с Router](#итерация-8-интеграция-с-router)
- [Шпаргалка](#шпаргалка)

---

## Как пользоваться

1. Создай файл `router/radix.ts` — в нём будет `Node` и `RadixTree`
2. Создай файл `router/radix.test.ts` — копируй тесты текущей итерации
3. Запускай: `npx vitest run router/radix.test.ts`
4. Когда все тесты зелёные — переходи к следующей итерации

---

## Итерация 1: Node — структура данных

**Идея**: прежде чем строить дерево, нужна нода. Radix tree node хранит:
- `path` — кусок строки (не обязательно полный сегмент! может быть `"te"`, `"st"`, `"ing"`)
- `children` — дочерние ноды
- `handler` — функция-обработчик (или `null` если нода промежуточная)

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
- Класс `Node` с полями `path`, `children`, `handler`
- Класс `RadixTree` с полем `root` (пустая нода)

```typescript
// radix.test.ts
import { Node, RadixTree } from "./radix.ts";

describe("Iter 1: Node", () => {
  it("Node создаётся с path", () => {
    const node = new Node("test");

    expect(node.path).toBe("test");
    expect(node.children).toEqual([]);
    expect(node.handler).toBeNull();
  });

  it("Node может хранить handler", () => {
    const fn = () => {};
    const node = new Node("test");
    node.handler = fn;

    expect(node.handler).toBe(fn);
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
class Node {
  path: string;
  children: Node[] = [];
  handler: Function | null = null;

  constructor(path: string) {
    this.path = path;
  }
}

class RadixTree {
  root = new Node("");
}
```

Буквально 10 строк. Не усложняй.
</details>

---

## Итерация 2: Insert — один путь

**Идея**: научить дерево вставлять маршрут. Начнём с самого простого — вставка одного пути
в пустое дерево. Путь всегда начинается с `/`.

Алгоритм insert:
1. Убери ведущий `/` (root и так представляет корень)
2. Если у текущей ноды нет children — создай child с полным оставшимся путём
3. Запиши handler на конечную ноду

```
insert("/users") →   root("")
                       └── "users" [handler]

insert("/")     →   root("") [handler]
```

**Тесты**:

```typescript
describe("Iter 2: insert — один путь", () => {
  it("insert в пустое дерево создаёт один child", () => {
    const tree = new RadixTree();
    const handler = vi.fn();

    tree.insert("/users", handler);

    expect(tree.root.children).toHaveLength(1);
    expect(tree.root.children[0].path).toBe("users");
    expect(tree.root.children[0].handler).toBe(handler);
  });

  it("insert корневого пути / ставит handler на root", () => {
    const tree = new RadixTree();
    const handler = vi.fn();

    tree.insert("/", handler);

    expect(tree.root.handler).toBe(handler);
    expect(tree.root.children).toHaveLength(0);
  });

  it("insert длинного пути создаёт один child (не разбивает по /)", () => {
    const tree = new RadixTree();
    const handler = vi.fn();

    tree.insert("/api/v1/users", handler);

    // В radix tree это ОДНА нода с path "api/v1/users"
    // потому что нет других путей, с которыми нужно делить префикс
    expect(tree.root.children).toHaveLength(1);
    expect(tree.root.children[0].path).toBe("api/v1/users");
    expect(tree.root.children[0].handler).toBe(handler);
  });

  it("два разных пути без общего префикса — два child'а", () => {
    const tree = new RadixTree();
    const a = vi.fn();
    const b = vi.fn();

    tree.insert("/users", a);
    tree.insert("/items", b);

    expect(tree.root.children).toHaveLength(2);

    const paths = tree.root.children.map((c) => c.path).sort();
    expect(paths).toEqual(["items", "users"]);
  });
});
```

<details>
<summary>Подсказка</summary>

```
insert(path, handler) {
  const p = path === "/" ? "" : path.slice(1); // убрать ведущий /

  if (p === "") {
    this.root.handler = handler;
    return;
  }

  // Пока что без split — просто ищем child с общим префиксом
  // Если не нашли — создаём новый child
  this._insert(this.root, p, handler);
}

_insert(node, path, handler) {
  // Пройдись по children:
  //   если child.path === path — повесь handler
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
После insert("/test"):     После insert("/testing"):
  root("")                    root("")
    └── "test" [H]              └── "test" [H]
                                      └── "ing" [H]
```

Ещё пример: вставили `/testing`, потом `/test`.

```
После insert("/testing"):   После insert("/test"):
  root("")                     root("")
    └── "testing" [H]            └── "test" [H]
                                       └── "ing" [H]
```

А вот `/test` и `/team`:

```
  root("")
    └── "te"            ← промежуточная нода, handler = null
          ├── "st" [H]
          └── "am" [H]
```

**Алгоритм split**:
1. Найди общий префикс между `child.path` и вставляемым `path`
2. Если префикс === child.path → иди глубже с остатком пути
3. Если префикс < child.path → разрежь child на две ноды
4. Если общего префикса нет — пропусти этот child

**Как разрезать ноду** (это ВАЖНО, нарисуй на бумаге):
```
Было: child = Node("testing", handler=H, children=[...])
Общий префикс с "team" = "te" (длина 2)

Шаг 1: создай newChild = Node("sting", handler=H, children=[...от child])
Шаг 2: обрежь child.path = "te", child.handler = null, child.children = [newChild]
Шаг 3: теперь вставь остаток "am" как ещё один child ноды "te"

Стало:
  "te" (handler=null)
    ├── "sting" [H]   ← бывший "testing"
    └── "am" [H]      ← новый
```

**Тесты**:

```typescript
describe("Iter 3: insert — split", () => {
  it("/test + /testing → split", () => {
    const tree = new RadixTree();
    const a = vi.fn();
    const b = vi.fn();

    tree.insert("/test", a);
    tree.insert("/testing", b);

    // root → "test"[a] → "ing"[b]
    expect(tree.root.children).toHaveLength(1);

    const testNode = tree.root.children[0];
    expect(testNode.path).toBe("test");
    expect(testNode.handler).toBe(a);
    expect(testNode.children).toHaveLength(1);

    const ingNode = testNode.children[0];
    expect(ingNode.path).toBe("ing");
    expect(ingNode.handler).toBe(b);
  });

  it("/testing + /test → split (обратный порядок)", () => {
    const tree = new RadixTree();
    const a = vi.fn();
    const b = vi.fn();

    tree.insert("/testing", a);
    tree.insert("/test", b);

    // root → "test"[b] → "ing"[a]
    const testNode = tree.root.children[0];
    expect(testNode.path).toBe("test");
    expect(testNode.handler).toBe(b);

    const ingNode = testNode.children[0];
    expect(ingNode.path).toBe("ing");
    expect(ingNode.handler).toBe(a);
  });

  it("/test + /team → split по общему префиксу 'te'", () => {
    const tree = new RadixTree();
    const a = vi.fn();
    const b = vi.fn();

    tree.insert("/test", a);
    tree.insert("/team", b);

    // root → "te"(null) → "st"[a], "am"[b]
    const teNode = tree.root.children[0];
    expect(teNode.path).toBe("te");
    expect(teNode.handler).toBeNull();
    expect(teNode.children).toHaveLength(2);

    const paths = teNode.children.map((c) => c.path).sort();
    expect(paths).toEqual(["am", "st"]);
  });

  it("три пути с общим префиксом", () => {
    const tree = new RadixTree();

    tree.insert("/test", vi.fn());
    tree.insert("/testing", vi.fn());
    tree.insert("/team", vi.fn());

    // root → "te"(null)
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

    tree.insert("/api/users", a);
    tree.insert("/api/items", b);

    // root → "api/"(null) → "users"[a], "items"[b]
    const apiNode = tree.root.children[0];
    expect(apiNode.path).toBe("api/");
    expect(apiNode.handler).toBeNull();
    expect(apiNode.children).toHaveLength(2);
  });

  it("вставка одного и того же пути дважды — перезаписывает handler", () => {
    const tree = new RadixTree();
    const first = vi.fn();
    const second = vi.fn();

    tree.insert("/test", first);
    tree.insert("/test", second);

    const testNode = tree.root.children[0];
    expect(testNode.handler).toBe(second);
    expect(testNode.children).toHaveLength(0);
  });

  it("insert не ломает существующие handler'ы", () => {
    const tree = new RadixTree();
    const a = vi.fn();
    const b = vi.fn();
    const c = vi.fn();

    tree.insert("/users", a);
    tree.insert("/users/list", b);
    tree.insert("/users/login", c);

    // root → "users"[a] → "/"(null) → "list"[b], "login"[c]
    // или root → "users"[a] → "/l"(null) → "ist"[b], "ogin"[c]
    // зависит от порядка, но handler'ы должны быть на месте
    const usersNode = tree.root.children[0];
    expect(usersNode.path).toBe("users");
    expect(usersNode.handler).toBe(a);
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
  suffix.handler = child.handler;
  suffix.children = child.children;

  child.path = child.path.slice(0, splitAt);
  child.handler = null;
  child.children = [suffix];
}
```
</details>

<details>
<summary>Подсказка: полный алгоритм _insert</summary>

```
_insert(node, path, handler):
  for each child in node.children:
    prefix = findCommonPrefix(child.path, path)

    if prefix === "":
      continue  // нет общего — пропускаем

    if prefix === child.path AND prefix === path:
      // точное совпадение — перезаписываем handler
      child.handler = handler
      return

    if prefix === child.path:
      // child.path полностью входит в path
      // идём глубже с остатком
      _insert(child, path.slice(prefix.length), handler)
      return

    if prefix.length < child.path.length:
      // частичное совпадение — нужен split
      splitNode(child, prefix.length)

      if prefix === path:
        // вставляемый путь = prefix, handler ставим на разрезанную ноду
        child.handler = handler
      else:
        // нужно ещё вставить остаток
        _insert(child, path.slice(prefix.length), handler)
      return

  // ни один child не подошёл — создаём новый
  newNode = new Node(path)
  newNode.handler = handler
  node.children.push(newNode)
```

Обрати внимание: в каждой ветке стоит `return`. Как только нашли подходящий child — работаем с ним и выходим.
</details>

---

## Итерация 4: Search — точный поиск

**Идея**: теперь нужно уметь искать handler по пути. Алгоритм search зеркалит insert,
но проще — не нужен split, только спуск по дереву.

Алгоритм:
1. Убери ведущий `/`
2. Ищи child, чей `path` является **префиксом** текущего пути
3. Отрежь этот префикс и иди глубже
4. Когда путь пуст — верни handler текущей ноды (или null)

```
Дерево:
  root → "te" → "st"[H1] → "ing"[H2]
              → "am"[H3]

search("/test"):    "te" match → "st" match → path пуст → H1 ✓
search("/testing"): "te" match → "st" match → "ing" match → path пуст → H2 ✓
search("/team"):    "te" match → "am" match → path пуст → H3 ✓
search("/tea"):     "te" match → нет child "a" → null ✗
search("/tes"):     "te" match → "st" не match ("s" != "st") → null ✗
```

**Тесты**:

```typescript
describe("Iter 4: search", () => {
  it("находит вставленный маршрут", () => {
    const tree = new RadixTree();
    const handler = vi.fn();

    tree.insert("/users", handler);
    const result = tree.search("/users");

    expect(result).toBe(handler);
  });

  it("возвращает null для несуществующего маршрута", () => {
    const tree = new RadixTree();
    tree.insert("/users", vi.fn());

    expect(tree.search("/items")).toBeNull();
  });

  it("находит корневой маршрут /", () => {
    const tree = new RadixTree();
    const handler = vi.fn();

    tree.insert("/", handler);

    expect(tree.search("/")).toBe(handler);
  });

  it("не матчит частичный путь (суффикс отсутствует)", () => {
    const tree = new RadixTree();
    tree.insert("/testing", vi.fn());

    expect(tree.search("/test")).toBeNull();
  });

  it("не матчит слишком длинный путь", () => {
    const tree = new RadixTree();
    tree.insert("/test", vi.fn());

    expect(tree.search("/testing")).toBeNull();
  });

  it("находит маршруты после split", () => {
    const tree = new RadixTree();
    const a = vi.fn();
    const b = vi.fn();

    tree.insert("/test", a);
    tree.insert("/team", b);

    expect(tree.search("/test")).toBe(a);
    expect(tree.search("/team")).toBe(b);
  });

  it("не матчит промежуточную ноду без handler'а", () => {
    const tree = new RadixTree();
    tree.insert("/test", vi.fn());
    tree.insert("/team", vi.fn());

    // "te" — промежуточная нода, handler = null
    expect(tree.search("/te")).toBeNull();
  });

  it("находит длинные пути", () => {
    const tree = new RadixTree();
    const handler = vi.fn();

    tree.insert("/api/v1/users/list", handler);

    expect(tree.search("/api/v1/users/list")).toBe(handler);
  });

  it("находит все маршруты в дереве из нескольких путей", () => {
    const tree = new RadixTree();
    const handlers = {
      users: vi.fn(),
      usersMe: vi.fn(),
      items: vi.fn(),
      itemsList: vi.fn(),
    };

    tree.insert("/users", handlers.users);
    tree.insert("/users/me", handlers.usersMe);
    tree.insert("/items", handlers.items);
    tree.insert("/items/list", handlers.itemsList);

    expect(tree.search("/users")).toBe(handlers.users);
    expect(tree.search("/users/me")).toBe(handlers.usersMe);
    expect(tree.search("/items")).toBe(handlers.items);
    expect(tree.search("/items/list")).toBe(handlers.itemsList);

    expect(tree.search("/users/other")).toBeNull();
    expect(tree.search("/unknown")).toBeNull();
  });
});
```

<details>
<summary>Подсказка</summary>

```
search(fullPath):
  path = fullPath === "/" ? "" : fullPath.slice(1)

  if path === "":
    return this.root.handler

  return this._search(this.root, path)

_search(node, path):
  for each child in node.children:
    if path.startsWith(child.path):
      remaining = path.slice(child.path.length)

      if remaining === "":
        return child.handler  // может быть null!

      return _search(child, remaining)

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

    tree.insert("/users", a);
    tree.insert("/users/", b);

    expect(tree.search("/users")).toBe(a);
    expect(tree.search("/users/")).toBe(b);
  });

  it("длинная цепочка split'ов", () => {
    const tree = new RadixTree();
    const handlers: Record<string, ReturnType<typeof vi.fn>> = {};

    const paths = ["/romane", "/romanus", "/romulus", "/rubens", "/ruber", "/rubicon", "/rubicundus"];
    for (const p of paths) {
      handlers[p] = vi.fn();
      tree.insert(p, handlers[p]);
    }

    for (const p of paths) {
      expect(tree.search(p)).toBe(handlers[p]);
    }

    // Не должны матчить частичные
    expect(tree.search("/rom")).toBeNull();
    expect(tree.search("/rub")).toBeNull();
    expect(tree.search("/roman")).toBeNull();
  });

  it("путь — подстрока другого пути (с /)", () => {
    const tree = new RadixTree();
    const a = vi.fn();
    const b = vi.fn();
    const c = vi.fn();

    tree.insert("/a", a);
    tree.insert("/a/b", b);
    tree.insert("/a/b/c", c);

    expect(tree.search("/a")).toBe(a);
    expect(tree.search("/a/b")).toBe(b);
    expect(tree.search("/a/b/c")).toBe(c);
    expect(tree.search("/a/b/c/d")).toBeNull();
  });

  it("общие префиксы с / на разных позициях", () => {
    const tree = new RadixTree();
    const h1 = vi.fn();
    const h2 = vi.fn();
    const h3 = vi.fn();

    tree.insert("/api/users", h1);
    tree.insert("/api/items", h2);
    tree.insert("/app/config", h3);

    expect(tree.search("/api/users")).toBe(h1);
    expect(tree.search("/api/items")).toBe(h2);
    expect(tree.search("/app/config")).toBe(h3);
    expect(tree.search("/api")).toBeNull();
    expect(tree.search("/app")).toBeNull();
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
      tree.insert(p, handlers[p]);
    }

    for (const p of paths) {
      const found = tree.search(p);
      expect(found).toBe(handlers[p]);
    }
  });

  it("insert после search не ломает дерево", () => {
    const tree = new RadixTree();
    const a = vi.fn();
    const b = vi.fn();

    tree.insert("/test", a);
    expect(tree.search("/test")).toBe(a);

    tree.insert("/testing", b);
    expect(tree.search("/test")).toBe(a);
    expect(tree.search("/testing")).toBe(b);
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

## Итерация 6: HTTP-методы на одном пути

**Идея**: на одном пути могут висеть разные handler'ы для разных HTTP-методов.
Вместо одного `handler` на ноде нужна `Map<string, Function>`.

**Изменения в Node**:
- `handler: Function | null` → `handlers: Map<string, Function>`
- `insert(path, handler)` → `insert(method, path, handler)`
- `search(path)` → `search(method, path)` возвращает `handler | null`

```typescript
describe("Iter 6: HTTP-методы", () => {
  it("GET и POST на одном пути", () => {
    const tree = new RadixTree();
    const get = vi.fn();
    const post = vi.fn();

    tree.insert("GET", "/users", get);
    tree.insert("POST", "/users", post);

    expect(tree.search("GET", "/users")).toBe(get);
    expect(tree.search("POST", "/users")).toBe(post);
  });

  it("неизвестный метод — null", () => {
    const tree = new RadixTree();
    tree.insert("GET", "/users", vi.fn());

    expect(tree.search("POST", "/users")).toBeNull();
    expect(tree.search("DELETE", "/users")).toBeNull();
  });

  it("разные методы на разных путях с общим префиксом", () => {
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

  it("split не теряет handler'ы разных методов", () => {
    const tree = new RadixTree();
    const getTest = vi.fn();
    const postTest = vi.fn();
    const getTeam = vi.fn();

    tree.insert("GET", "/test", getTest);
    tree.insert("POST", "/test", postTest);
    tree.insert("GET", "/team", getTeam);

    // split произошёл → "te" → "st", "am"
    // handler'ы обоих методов на "st" должны сохраниться
    expect(tree.search("GET", "/test")).toBe(getTest);
    expect(tree.search("POST", "/test")).toBe(postTest);
    expect(tree.search("GET", "/team")).toBe(getTeam);
  });
});
```

<details>
<summary>Подсказка</summary>

Замени в Node:
```typescript
// Было:
handler: Function | null = null;

// Стало:
handlers: Map<string, Function> = new Map();
```

В `insert` вместо `node.handler = handler` пиши `node.handlers.set(method, handler)`.
В `search` вместо `return node.handler` пиши `return node.handlers.get(method) ?? null`.

В `splitNode` перенеси **всю Map** на suffix ноду:
```typescript
suffix.handlers = child.handlers;
child.handlers = new Map();
```
</details>

---

## Итерация 7: prettyPrint

**Идея**: для отладки нужно уметь визуализировать дерево. `prettyPrint()` должен
показывать структуру нод с отступами.

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
describe("Iter 7: prettyPrint", () => {
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

  it("показывает методы у нод с handler'ами", () => {
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
    const methods = Array.from(child.handlers.keys());
    const suffix = methods.length ? ` (${methods.join(", ")})` : "";

    lines.push(indent + connector + child.path + suffix);

    const nextIndent = indent + (isLast ? "    " : "│   ");
    this._print(child.children, nextIndent, lines);
  });
}
```
</details>

---

## Итерация 8: Интеграция с Router

**Идея**: заменить `Map<string, Handler>` в Router на `RadixTree`. Теперь Router
использует дерево для хранения и поиска маршрутов. Compose и middleware — без изменений.

**Что нужно сделать**:
1. `addRoute()` → `this.tree.insert(method, path, composedFn)`
2. `handle()` → `this.tree.search(method, path)` → вызвать найденный handler

```typescript
describe("Iter 8: Router + RadixTree", () => {
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
class Router {
  private tree = new RadixTree();
  private middlewares: Middleware[] = [];

  addRoute(method: string, path: string, handler: Handler): this {
    const fn = compose([...this.middlewares, handler]);
    this.tree.insert(method, path, fn);
    return this;
  }

  async handle(req: any, res: any) {
    const [path, queryStr] = req.url.split("?");
    const handler = this.tree.search(req.method, path);

    if (!handler) return;

    const query = queryStr
      ? Object.fromEntries(new URLSearchParams(queryStr))
      : {};
    const ctx = { req: { ...req, url: path, query }, res };

    await handler(ctx, async () => {});
  }

  prettyPrint(): string {
    return this.tree.prettyPrint();
  }

  // get, post, patch, delete, use — без изменений
}
```

Вся сложность — в RadixTree. Router просто делегирует.
</details>

---

## Шпаргалка

| # | Что делаем | Строк кода | Сложность |
|---|---|---|---|
| 1 | Node — структура данных | ~10 | Легко |
| 2 | Insert — один путь | ~20 | Легко |
| 3 | Insert — split (общий префикс) | ~40 | **Сложно** |
| 4 | Search — поиск по дереву | ~20 | Средне |
| 5 | Edge cases (только тесты) | 0 | Средне |
| 6 | HTTP-методы | ~15 | Легко |
| 7 | prettyPrint | ~20 | Легко |
| 8 | Интеграция с Router | ~15 | Средне |

**Итого**: ~140 строк на полное radix tree со статикой.

### Что дальше

Когда этот гайд пройден, у тебя есть **работающее radix tree без параметров**.
Следующий шаг — добавить `:param` ноды. Это будет отдельный гайд, но ключевая идея:
- Параметрическая нода — это особый тип child'а
- При search: сначала проверяй static children (приоритет!), потом parametric
- Параметрическая нода "съедает" всё до следующего `/`

Но это — **потом**. Сначала пройди все 8 итераций здесь.
