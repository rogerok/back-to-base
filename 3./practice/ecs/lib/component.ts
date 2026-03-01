import { Class } from "./types.ts";

export interface Component extends Record<string, any> {
  id?: string;

  type?: string;
}

export class ComponentsCollection {
  private map: Map<Class<unknown>, unknown> = new Map();

  constructor(private _id?: string) {}

  get id() {
    return this._id;
  }

  get<T extends Component>(constructor: Class<T>): T {
    if (!this.map.has(constructor)) {
      throw new Error(`No map found for ${constructor.name}`);
    }

    return this.map.get(constructor) as T;
  }

  add<T extends Component>(val: Class<T>) {
    this.map.set(val, new val());
  }

  delete<T extends Component>(val: Class<T>) {
    this.map.delete(val);
  }

  all() {
    return this.map;
  }
}
