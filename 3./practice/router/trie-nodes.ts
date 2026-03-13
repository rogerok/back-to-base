// export class TrieNodes {
//   param = new Map<string, TrieNodes>();
//   handlers = new HandlerStorage();
//   middlewares: Middleware[] = [];
//   params: Record<string, number> = {};
//   paramName: string = "";
// }

// export class TrieNodes {
//   param = new Map<string, TrieNodes>();
//   handlers = new HandlerStorage();
//   middlewares: Middleware[] = [];
//   params: Record<string, number> = {};
//   paramName: string = "";
// }

import { HandlerStorage } from "./handler-storage.ts";

// export interface TrieNode<T = unknown> {
//   handlers: HandlerStorage;
//   key: string;
//   param?: TrieNode<T>;
//   static?: TrieNode<T>;
//   wildcard?: TrieNode<T>;
// }

export class TrieNode {
  handlers = new HandlerStorage();
  param = new Map<string, TrieNode>();
  static = new Map<string, TrieNode>();
  wildcard = new Map<string, TrieNode>();

  constructor(public key: string) {}
}
