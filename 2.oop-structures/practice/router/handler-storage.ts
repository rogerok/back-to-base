import { Handler, Methods } from "./types";

export class HandlerStorage {
  handlers = new Map<Methods, Handler>();

  addHandler(method: Methods, handler: Handler) {
    this.handlers.set(method, handler);
  }

  getHandler(method: Methods): Handler | null {
    const handler = this.handlers.get(method);
    return handler ? handler : null;
  }

  getAllowedMethods(): Methods[] {
    return Array.from(this.handlers.keys());
  }

  hasHandlers(): boolean {
    return !!this.handlers.size;
  }

  removeHandler(method: Methods) {
    this.handlers.delete(method);
  }
}
