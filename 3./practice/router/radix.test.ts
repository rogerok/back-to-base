// radix.test.ts
import { Node, RadixTree } from "./radix.ts";

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

    const paths = [
      "/romane",
      "/romanus",
      "/romulus",
      "/rubens",
      "/ruber",
      "/rubicon",
      "/rubicundus",
    ];
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
      "/",
      "/users",
      "/users/list",
      "/users/create",
      "/items",
      "/items/list",
      "/items/create",
      "/api/v1/health",
      "/api/v1/users",
      "/api/v1/items",
      "/api/v2/health",
      "/api/v2/users",
      "/api/v2/items",
      "/auth/login",
      "/auth/logout",
      "/auth/refresh",
      "/docs",
      "/docs/api",
      "/docs/guides",
      "/docs/faq",
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
      items: vi.fn(),
      itemsList: vi.fn(),
      users: vi.fn(),
      usersMe: vi.fn(),
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
    const c = vi.fn();

    tree.insert("GET", "/users", a);
    tree.insert("GET", "/items", b);
    tree.insert("GET", "/huaitems", c);

    expect(tree.root.children).toHaveLength(3);

    const paths = tree.root.children.map((c) => c.path).sort();
    expect(paths).toEqual(["huaitems", "items", "users"]);
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
