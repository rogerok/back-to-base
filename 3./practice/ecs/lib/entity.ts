import { Collection } from "./collection.ts";
import { Component, ComponentsCollection } from "./component.ts";

export abstract class AbstractEntity<Comp extends Component = Component> {
  constructor(private readonly _id?: string) {
    this._components = new ComponentsCollection();
  }

  get id() {
    return this._id;
  }

  private _components = new ComponentsCollection<Comp>();

  get components() {
    return this._components;
  }
}

export class EntitiesCollection extends Collection<AbstractEntity> {}
