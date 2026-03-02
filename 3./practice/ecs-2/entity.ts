import { ComponentContainer } from "./component.ts";

export abstract class AbstractEntity<T> {}

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
