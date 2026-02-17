import { HandlerStorage } from "./handler-storage.ts";
import { Handler, Methods, Middleware, ObjectValues, ParamsType } from "./types";

const NodeTypes = {
  Parametric: "parametric",
  Static: "static",
  Wildcard: "wildcard",
} as const;

export type NodeType = ObjectValues<typeof NodeTypes>;

class Node {
  children: Node[] = [];
  paramName: string | null = null;
  path: string;
  type: NodeType;
  handlerStorage: HandlerStorage = new HandlerStorage();

  constructor(path: string = "", type: NodeType = NodeTypes.Static) {
    this.path = path;
    this.type = type;
  }

  isEndpoint(): boolean {
    return this.handlerStorage.hasHandlers();
  }
}

export class RouteTree {
  root: Node;

  constructor() {
    this.root = new Node();
  }

  search(method: Methods, path: string): { handler: Middleware; params: ParamsType } | null {
    if (path !== "/" && path.endsWith("/")) {
      path = path.slice(0, -1);
    }

    if (path.startsWith("/")) {
      path = path.slice(1);
    }

    const params: ParamsType = {};
    const handler = this._searchNode(this.root, path, params)?.handlerStorage.getHandler(method);

    return handler ? { handler, params } : null;
  }

  findCommonPrefix(str1: string, str2: string): string {
    let i = 0;

    const minLen = Math.min(str1.length, str2.length);

    while (i < minLen && str1[i] === str2[i]) {
      i++;
    }

    return str1.slice(0, i);
  }

  insert(method: Methods, path: string, handler: Handler): void {
    if (path !== "/" && path.endsWith("/")) {
      path = path.slice(0, -1); // remove trailing slash
    }

    if (path.startsWith("/")) {
      path = path.slice(1); // remove leading slash
    }

    this._insert(this.root, path, method, handler);
  }

  print(): void {
    this._print(this.root, "", true);
  }

  private _searchNode(node: Node, path: string, params: ParamsType): Node | null {
    if (path.startsWith("/")) {
      path = path.slice(1);
    }

    if (path.length === 0) {
      return node.handlerStorage.hasHandlers() ? node : null;
    }

    for (const child of node.children) {
      if (child.type === NodeTypes.Static && path.startsWith(child.path)) {
        const result = this._searchNode(child, path.slice(child.path.length), params);

        if (result) {
          return result;
        }
      }

      if (child.type === NodeTypes.Parametric) {
        const slashIndex = path.indexOf("/");
        const paramValue = slashIndex === -1 ? path : path.slice(0, slashIndex);

        if (child.paramName) {
          params[child.paramName] = paramValue;

          const remaining = slashIndex === -1 ? "" : path.slice(slashIndex);
          const result = this._searchNode(child, remaining, params);

          if (result) {
            return result;
          }

          // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
          delete params[child.paramName];
        }
      }

      if (child.type === NodeTypes.Wildcard) {
        if (child.paramName) {
          params[child.paramName] = path;
          return child;
        }
      }
    }

    return null;
  }

  private _insert(node: Node, path: string, method: Methods, handler: Handler): void {
    // If path is empty - it's end point

    if (path.startsWith("/")) {
      path = path.slice(1);
    }

    if (!path.length) {
      node.handlerStorage.addHandler(method, handler);
      return;
    }

    // Search in child nodes
    for (const child of node.children) {
      const commonPrefix = this.findCommonPrefix(child.path, path);

      if (commonPrefix.length) {
        //  commonPrefix === child.path -> recursion
        if (commonPrefix.length === child.path.length) {
          this._insert(child, path.slice(child.path.length), method, handler);
          return;
        }

        if (commonPrefix.length < child.path.length) {
          // commonPrefix < child.path (need split)

          this.splitNode(child, commonPrefix.length);

          const remaining = path.slice(commonPrefix.length);

          this._insert(child, remaining, method, handler);
          return;
        }
      }
    }

    // Create new node if there aren't matches

    this._createNode(node, path, method, handler);
  }

  private _print(node: Node, prefix: string, isLast: boolean): void {
    const connector = isLast ? "└─ " : "├─ ";
    const pathDisplay = node.path || "(root)";

    // Показываем методы из handlerStorage
    const methods = node.handlerStorage.getAllowedMethods();
    const methodsMark = methods.length > 0 ? ` [${methods.join(", ")}]` : "";

    console.log(prefix + connector + pathDisplay + methodsMark);

    const childPrefix = prefix + (isLast ? "    " : "│   ");
    node.children.forEach((child, idx) => {
      this._print(child, childPrefix, idx === node.children.length - 1);
    });
  }

  private splitNode(node: Node, splitAt: number): void {
    const childPath = node.path.slice(splitAt);
    const newChild = new Node(childPath, NodeTypes.Static);

    newChild.handlerStorage = node.handlerStorage;
    newChild.children = node.children;

    node.path = node.path.slice(0, splitAt);
    node.handlerStorage = new HandlerStorage();
    node.children = [newChild];
  }

  private _createNode(parent: Node, path: string, method: Methods, handler: Handler): void {
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
        this._insert(paramNode, remaining, method, handler);
      } else {
        paramNode.handlerStorage.addHandler(method, handler);
      }
    } else if (path.startsWith("*")) {
      const wildcardName = path.slice(1);

      const wildcardNode = new Node(wildcardName, NodeTypes.Wildcard);
      wildcardNode.paramName = wildcardName;
      wildcardNode.handlerStorage.addHandler(method, handler);
      parent.children.push(wildcardNode);
      return;
    } else {
      const paramIndex = path.indexOf(":");
      const wildcardIndex = path.indexOf("*");
      let specialIndex = -1;

      if (paramIndex !== -1 && wildcardIndex !== -1) {
        specialIndex = Math.min(paramIndex, wildcardIndex);
      } else if (paramIndex !== -1) {
        specialIndex = paramIndex;
      } else if (wildcardIndex !== -1) {
        specialIndex = wildcardIndex;
      }

      if (specialIndex !== -1) {
        let staticPart = path.slice(0, specialIndex); // "/users"
        const remaining = path.slice(specialIndex); // ":id/posts"

        if (staticPart.endsWith("/")) {
          staticPart = staticPart.slice(0, -1);
        }

        const staticNode = new Node(staticPart, NodeTypes.Static);
        parent.children.push(staticNode);

        this._insert(staticNode, remaining, method, handler);
      } else {
        const staticNode = new Node(path, NodeTypes.Static);
        staticNode.handlerStorage.addHandler(method, handler);
        parent.children.push(staticNode);
      }
    }
  }
}
