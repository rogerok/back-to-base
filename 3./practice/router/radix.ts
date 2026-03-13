import { HandlerStorage } from "./handler-storage.ts";
import { Handler, Methods } from "./types";
import { getPathWithoutLeading } from "./utils.ts";

export class Node {
  children: Node[] = [];
  handlerStorage = new HandlerStorage();

  constructor(public path: string) {}
}

export class RadixTree {
  root = new Node("");

  insert = (method: Methods, path: string, handler: Handler) => {
    const withoutLeading = getPathWithoutLeading(path);

    if (!withoutLeading) {
      this.root.handlerStorage.addHandler(method, handler);
      return;
    }

    this._insert(this.root, method, withoutLeading, handler);
  };

  _insert = (node: Node, method: Methods, path: string, handler: Handler) => {
    if (!path) {
      node.handlerStorage.addHandler(method, handler);
      return;
    }

    for (const child of node.children) {
      const prefix = this.findCommonPrefix(child.path, path);

      // if there is no common prefix - continue iteration
      if (!prefix) {
        continue;
      }

      // if complete coincidence - we reach destination, add handler to storage
      if (child.path === path) {
        child.handlerStorage.addHandler(method, handler);
        return;
      }

      // if prefix === child.path - need to go further with rest of path
      if (prefix === child.path) {
        this._insert(child, method, path.slice(prefix.length), handler);
        return;
      }

      // if prefix is shorter than path of child, when we need split node
      if (prefix.length < child.path.length) {
        this.splitNode(child, prefix.length);
        // go further with rest of path
        this._insert(child, method, path.slice(prefix.length), handler);
        return;
      }
    }

    this.addNode(node, method, path, handler);
  };

  search = (method: Methods, path: string): Handler | null => {
    const withoutLeading = getPathWithoutLeading(path);

    if (!withoutLeading) {
      return this.root.handlerStorage.getHandler(method);
    }

    return this._search(this.root, method, withoutLeading);
  };

  _search = (node: Node, method: Methods, path: string): Handler | null => {
    for (const child of node.children) {
      if (path.startsWith(child.path)) {
        const remaining = path.slice(child.path.length);

        if (!remaining) {
          return child.handlerStorage.getHandler(method);
        }

        return this._search(child, method, remaining);
      }
    }

    return null;
  };

  prettyPrint(): string {
    const lines: string[] = ["root"];
    this._prettyPrint(this.root.children, "", lines);

    return lines.join("\n");
  }

  _prettyPrint = (children: Node[], indent: string, lines: string[]) => {
    children.forEach((child, idx) => {
      const isLast = idx === children.length - 1;
      const connector = isLast ? "└── " : "├── ";
      const methods = child.handlerStorage.getMethods();
      const suffix = methods.length ? ` [${methods.join(", ")}]` : "";

      lines.push(indent + connector + child.path + suffix);
      const nextIndent = indent + (isLast ? "  " : "│ ");

      this._prettyPrint(child.children, nextIndent, lines);
    });
  };

  private splitNode = (child: Node, prefixLength: number) => {
    const path = child.path.slice(prefixLength);

    const suffix = new Node(path);
    // liftup child node and replace child's children and storage to new node

    suffix.handlerStorage = child.handlerStorage;
    suffix.children = child.children;

    /* change child path to prefix, make it empty node
        "child" (пустой storage)
          ├── "suffix" [GET: H]
     */
    child.path = child.path.slice(0, prefixLength);
    child.handlerStorage = new HandlerStorage();
    child.children = [suffix];
  };

  private addNode = (node: Node, method: Methods, path: string, handler: Handler) => {
    const newNode = new Node(path);
    newNode.handlerStorage.addHandler(method, handler);
    node.children.push(newNode);
    return node;
  };

  private findCommonPrefix(a: string, b: string): string {
    let i = 0;
    const min = Math.min(a.length, b.length);

    while (i < min && a[i] === b[i]) {
      i += 1;
    }

    return a.slice(0, i);
  }
}
