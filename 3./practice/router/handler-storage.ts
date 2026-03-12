import { Handler, Methods } from "./types";

export class HandlerStorage {
  handlers: Map<Methods, Handler> = new Map();
  unconstrainedHandler = null; // used as reference to the handler

  addHandler = (method: Methods, handler: Handler): void => {
    this.handlers.set(method, handler);
  };

  getHandler = (method: Methods): Handler | null => {
    return this.handlers.get(method) ?? this.unconstrainedHandler;
  };

  getMethods = (): Methods[] => {
    return Array.from(this.handlers.keys());
  };

  hasHandlers = (method: Methods): boolean => {
    return this.handlers.has(method);
  };
}
