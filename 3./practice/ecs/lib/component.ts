import { Class } from "./types.ts";

export interface Component extends Record<string, any> {
  id?: string;

  type?: string;
}

export class ComponentsCollection<T = Component> {
  private map: Map<Class<T>, T> = new Map();

  constructor(private _id?: string) {}

  get id() {
    return this._id;
  }

  get(constructor: Class<T>): T {
    if (!this.map.has(constructor)) {
      throw new Error(`No map found for ${constructor.name}`);
    }

    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    return this.map.get(constructor)!;
  }

  add(constructor: Class<T>) {
    this.map.set(constructor, new constructor());
  }

  delete(constructor: Class<T>) {
    this.map.delete(constructor);
  }

  all() {
    return this.map;
  }
}
