import { HandlerStorage } from "./handler-storage.ts";
import { ObjectValues } from "./types";

export const NodeTypes = {
  Parametric: "parametric",
  Static: "static",
  Wildcard: "wildcard",
} as const;

export type NodeType = ObjectValues<typeof NodeTypes>;

// Можно создать базовый класс и от него наследовать классы NodeParametric, NodeStatic, NodeWildcard

export class Node {
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
