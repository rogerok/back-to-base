// radix.test.ts
import { Node, RadixTree } from "./radix.ts";

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
