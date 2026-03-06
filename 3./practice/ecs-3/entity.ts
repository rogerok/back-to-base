import { Component, ComponentContainer } from "./component.ts";

export abstract class AbstractEntity {
  constructor(
    public id: string,
    components: Component[] = [],
  ) {
    components.forEach((component) => {
      this._components.add(component);
    });
  }

  private _components = new ComponentContainer();

  get components() {
    return this._components;
  }
}

export class EntitiesContainer {
  private map = new Map<AbstractEntity, ComponentContainer>();

  private entitiesToDestroy: AbstractEntity[] = [];

  add(entity: AbstractEntity) {
    this.map.set(entity, new ComponentContainer());
  }

  remove(entity: AbstractEntity) {
    this.entitiesToDestroy.push(entity);
  }
}

export class EntitiesCollection {}
