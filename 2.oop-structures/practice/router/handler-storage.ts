import { Handler } from "./types";

export class HandlerStorage {
  handlers = new Map<string, Handler>();

  addHandler(handler: Handler, route: string) {
    this.handlers.set(route, handler);
  }
}
