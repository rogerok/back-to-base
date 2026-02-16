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
    this._insert(this.root, path, handler);
  }

  print(): void {
    this._print(this.root, "", true);
  }

  private _insert(node: Node, path: string, handler: Handler): void {
    // If path is empty - it's end point

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

    const newNode = new Node(path, NodeTypes.Static);
    newNode.handler = handler;
    node.children.push(newNode);
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
}

const tree = new RadixTree();

tree.insert("/users", () => "handler1");
tree.insert("/users/profile", () => "handler2");
tree.insert("/user/posts", () => "handler3");
tree.print();
