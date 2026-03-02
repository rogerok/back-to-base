import { Component, ComponentContainer } from "./component.ts";

export abstract class AbstractEntity {
  components = new ComponentContainer();

  constructor(
    public id: string,
    components: Component[] = [],
  ) {
    components.forEach((component) => {
      this.components.add(component);
    });
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
