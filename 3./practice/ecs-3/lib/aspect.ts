import { ComponentClass } from "../types.ts";
import { Component } from "./component.ts";
import { Dispatcher } from "./dispatcher.ts";
import { Engine } from "./engine.ts";
import { Entity, EntityCollection } from "./entity.ts";

type CompType = ComponentClass<Component>;

export interface AspectListener {
  onAddedComponents?: (entity: Entity, ...components: Component[]) => void;
  onAddedEntities?: (...entities: Entity[]) => void;
  onClearedComponents?: (entity: Entity) => void;

  onClearedEntities?: () => void;

  onRemovedComponents?: (entity: Entity, ...components: Component[]) => void;

  onRemoveEntities?: (...entities: Entity[]) => void;
}

export class Aspect<L extends AspectListener = AspectListener> extends Dispatcher<L> {
  constructor(
    public entities: EntityCollection,
    public components: CompType[] = [],
  ) {
    super();
  }

  static for = (engine: Engine, components?: CompType[]): Aspect => {
    return new Aspect(engine.entities, components);
  };

  all = (...components: CompType[]): this => {
    const unique = new Set(components);

    this.components = [...unique];

    return this;
  };
}
