import { Component, CompType } from "./component.ts";
import { Dispatcher } from "./dispatcher.ts";
import { Engine } from "./engine.ts";
import { Entity, EntityCollection } from "./entity.ts";

export interface AspectListener {
  onAddedComponents?: (entity: Entity, ...components: Component[]) => void;
  onAddedEntities?: (...entities: Entity[]) => void;
  onClearedComponents?: (entity: Entity) => void;

  onClearedEntities?: () => void;

  onRemovedComponents?: (entity: Entity, ...components: Component[]) => void;

  onRemoveEntities?: (...entities: Entity[]) => void;
}

export class Aspect<L extends AspectListener = AspectListener> extends Dispatcher<L> {
  private filteredEntities: Entity[] = [];
  // protected entityListeners: CollectionListener<Entity>;
  private entityListeners = new Map<Entity, object>();

  constructor(
    private source: EntityCollection,
    private allComponents: CompType[] = [],
  ) {
    super();

    source.addListener({
      onAdded: (...entities: Entity[]) => {
        for (const e of entities) this.trackEntity(e);
      },
      onCleared: () => {
        this.filteredEntities = [];
        this.entityListeners.clear();
      },
      onRemoved: (...entities: Entity[]) => {
        for (const e of entities) this.untrackEntity(e);
      },
    });
  }

  get entities(): Entity[] {
    return this.filteredEntities;
  }

  static for = (engine: Engine, components?: CompType[]): Aspect => {
    return new Aspect(engine.entities, components);
  };

  all = (...components: CompType[]): this => {
    const unique = [...new Set(components)];

    this.filteredEntities = [];

    this.allComponents = unique;

    for (const entity of this.source.elements) {
      this.trackEntity(entity);
    }

    return this;
  };

  private checkEntity = (entity: Entity): void => {
    const matches = this.matchesAll(entity);
    const alreadyIn = this.filteredEntities.includes(entity);

    if (matches && !alreadyIn) {
      this.filteredEntities.push(entity);
    } else if (!matches && alreadyIn) {
      this.filteredEntities.splice(this.filteredEntities.indexOf(entity), 1);
    }
  };

  private matchesAll = (entity: Entity): boolean => {
    return this.allComponents.every((compCls) => !!entity.components.get(compCls));
  };

  private trackEntity(entity: Entity): void {
    if (!this.entityListeners.has(entity)) {
      const listener = {
        onAddedComponents: () => {
          this.checkEntity(entity);
        },
        onRemovedComponents: () => {
          this.checkEntity(entity);
        },
      };

      entity.addListener(listener);

      this.entityListeners.set(entity, listener);
    }

    this.checkEntity(entity);
  }

  private untrackEntity = (entity: Entity): void => {
    const idx = this.filteredEntities.indexOf(entity);
    if (idx > -1) {
      this.filteredEntities.splice(idx, 1);
    }

    const listener = this.entityListeners.get(entity);

    if (listener) {
      entity.removeListener(listener);
      this.entityListeners.delete(entity);
    }
  };
}
