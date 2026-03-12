import { ObjectValues } from "../../../helpers/types.ts";
import { HandlerStorage } from "./handler-storage.ts";
import { Handler, Methods } from "./types";

export const NodeTypes = {
  parametric: 1,
  static: 0,
  wildcard: 2,
} as const;

export type NodeTypesValue = ObjectValues<typeof NodeTypes>;

// abstract class Node {
//   handlerStorage: HandlerStorage | null = null;
//
//   protected constructor(
//     public path: string,
//     public type: NodeTypesValue,
//   ) {}
//
//   addRoute = (method: Methods, handler: Handler): void => {
//     if (!this.handlerStorage) {
//       this.handlerStorage = new HandlerStorage();
//     }
//
//     this.handlerStorage.addHandler(method, handler);
//   };
// }
//
// export class NodeStatic extends Node {
//   constructor(path: string) {
//     super(path, NodeTypes.static);
//   }
// }
//
// export class NodeParametric extends Node {
//   paramName: string = "";
//
//   constructor(path: string) {
//     super(path, NodeTypes.parametric);
//   }
// }

export class Node {
  children: Node[] = [];
  paramName: string | null = null;
  handlerStorage: HandlerStorage | null = null;

  constructor(
    public path = "",
    public type: NodeTypesValue = NodeTypes.static,
  ) {}

  addRoute = (method: Methods, handler: Handler): void => {
    if (!this.handlerStorage) {
      this.handlerStorage = new HandlerStorage();
    }

    this.handlerStorage.addHandler(method, handler);
  };
}

export class ParentNode extends Node {
  root = new Node();

  insert(method: Methods, path: string, handler: Handler): void {
    const normalizedPath = path.startsWith("/") ? path.substring(1) : path;

    this._insert(this.root, method, normalizedPath, handler);
  }

  _insert(node: Node, method: Methods, path: string, handler: Handler): void {
    if (!path.length) {
      node.handlerStorage?.addHandler(method, handler);
    }

    node.children.forEach((child) => {
      if (child.type !== NodeTypes.static) {
        return;
      }

      const prefix = this.findCommonPrefix(child.path, path);

      if (prefix.length < child.path.length) {
        const remaining = child.path.slice(prefix.length);

        const childHandler = child.handlerStorage?.getHandler(method);

        if (childHandler) {
          node.addRoute(method, childHandler);
        }

        child.path = remaining;
        node.children.push(...child.children);
        child.children = [];
      }

      if (!prefix.length) {
        return;
      }

      if (prefix === child.path) {
        this._insert(child, method, path.slice(prefix.length), handler);
        return;
      }
    });

    if (path.startsWith(":")) {
      const slashIdx = path.indexOf("/");
      const paramName = slashIdx === -1 ? path.slice(1) : path.slice(1, slashIdx);

      node.children.forEach((child) => {
        if (child.type === NodeTypes.parametric && child.paramName === paramName) {
          const remaining = slashIdx === -1 ? "" : path.slice(slashIdx);

          this._insert(child, method, remaining, handler);
          return;
        }
      });
    }

    this._createNode(node, method, path, handler);
  }

  _createNode(node: Node, method: Methods, path: string, handler: Handler): void {}

  private findCommonPrefix(a: string, b: string): string {
    let i = 0;
    const min = Math.min(a.length, b.length);

    while (i < min && a[i] === b[i]) {
      i += 1;
    }

    return a.slice(0, i);
  }
}
