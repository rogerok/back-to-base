import { Collection } from "./collection.ts";
import { Component, ComponentsCollection } from "./component.ts";
import { Class } from "./types.ts";

export class Entity {
  constructor(
    private readonly _id?: string,
    components: Class<Component>[] = [],
  ) {
    components.forEach((comp) => {
      this.components.add(comp);
    });
  }

  get id() {
    return this._id;
  }

  private _components = new ComponentsCollection();

  get components(): ComponentsCollection {
    return this.components;
  }
}

export class EntitiesCollection extends Collection<Class<Entity>> {}
