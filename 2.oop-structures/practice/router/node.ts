import { Handler, ObjectValues } from "./types";

const NodeTypes = {
  Parametric: "parametric",
  Static: "static",
  Wildcard: "wildcard",
} as const;

export type NodeType = ObjectValues<typeof NodeTypes>;

class Node {
  children: Node[] = [];
  handler: Handler | null = null;
  paramName: string | null = null;
  path: string;
  type: NodeType;

  constructor(path: string = "", type: NodeType = NodeTypes.Static) {
    this.path = path;
    this.type = type;
  }

  isEndpoint() {
    return !!this.handler;
  }
}

class RadixTree {
  root: Node;

  constructor() {
    this.root = new Node();
  }

  search(path: string): { handler: Handler; params: Record<string, string> } | null {
    // TODO: позже реализуем
    console.log("Search:", path);
    return null;
  }

  findCommonPrefix(str1: string, str2: string): string {
    let i = 0;

    const minLen = Math.min(str1.length, str2.length);

    while (i < minLen && str1[i] === str2[i]) {
      i++;
    }

    return str1.slice(0, i);
  }

  insert(path: string, handler: Handler): void {
    if (path !== "/" && path.endsWith("/")) {
      path = path.slice(0, -1); // remove trailing slash
    }

    if (path.startsWith("/")) {
      path = path.slice(1); // remove leading slash
    }

    this._insert(this.root, path, handler);
  }

  print(): void {
    this._print(this.root, "", true);
  }

  private _insert(node: Node, path: string, handler: Handler): void {
    // If path is empty - it's end point

    if (path.startsWith("/")) {
      path = path.slice(1);
    }

    if (!path.length) {
      node.handler = handler;
      return;
    }

    // Search in child nodes
    for (const child of node.children) {
      const commonPrefix = this.findCommonPrefix(child.path, path);

      if (commonPrefix.length) {
        //  commonPrefix === child.path -> recursion
        if (commonPrefix.length === child.path.length) {
          this._insert(child, path.slice(child.path.length), handler);
          return;
        }

        if (commonPrefix.length < child.path.length) {
          // 2b. commonPrefix < child.path (нужен split)

          this.splitNode(child, commonPrefix.length);

          const remaining = path.slice(commonPrefix.length);

          this._insert(child, remaining, handler);
          return;
        }
      }
    }

    // Create new node if there aren't matches

    this._createNode(node, path, handler);
  }

  private _print(node: Node, prefix: string, isLast: boolean): void {
    const connector = isLast ? "└─ " : "├─ ";
    const pathDisplay = node.path || "(root)";
    const handlerMark = node.handler ? " [HANDLER]" : "";

    console.log(prefix + connector + pathDisplay + handlerMark);

    const childPrefix = prefix + (isLast ? "    " : "│   ");
    node.children.forEach((child, idx) => {
      this._print(child, childPrefix, idx === node.children.length - 1);
    });
  }

  private splitNode(node: Node, splitAt: number): void {
    const childPath = node.path.slice(splitAt);
    const newChild = new Node(childPath, NodeTypes.Static);

    newChild.handler = node.handler;
    newChild.children = node.children;

    node.path = node.path.slice(0, splitAt);

    node.handler = null;
    node.children = [newChild];
  }

  private _createNode(parent: Node, path: string, handler: Handler): void {
    // if node is parametric

    if (path.startsWith(":")) {
      // find end of param
      const slashIndex = path.indexOf("/", 1);

      // extract param without ":"
      const paramName =
        slashIndex === -1
          ? path.slice(1) // ":id" → "id"
          : path.slice(1, slashIndex); // ":id/posts" → "id"

      const remaining = slashIndex === -1 ? "" : path.slice(slashIndex);

      const paramNode = new Node(`:${paramName}`, NodeTypes.Parametric);
      paramNode.paramName = paramName;
      parent.children.push(paramNode);

      if (remaining.length) {
        this._insert(paramNode, remaining, handler);
      } else {
        paramNode.handler = handler;
      }
    } else {
      const paramIndex = path.indexOf(":");

      if (paramIndex !== -1) {
        const staticPart = path.slice(0, paramIndex); // "/users"
        const remaining = path.slice(paramIndex); // ":id/posts"

        const staticNode = new Node(staticPart, NodeTypes.Static);
        parent.children.push(staticNode);

        this._insert(staticNode, remaining, handler);
      } else {
        const staticNode = new Node(path, NodeTypes.Static);
        staticNode.handler = handler;
        parent.children.push(staticNode);
      }
    }
  }
}

const tree = new RadixTree();

tree.insert("/users", () => "listUsers");
tree.insert("/users/:id", () => "getUser");
tree.insert("/users/:id/posts", () => "getUserPosts");
tree.insert("/users/:id/posts/:postId", () => "getUserPost");
tree.insert("/posts", () => "listPosts");
tree.insert("/posts/:postId", () => "getPost");

tree.print();
