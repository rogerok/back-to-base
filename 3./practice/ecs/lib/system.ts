import { Collection } from "./collection.ts";
import { Component } from "./component.ts";
import { Engine } from "./engine.ts";
import { Entity } from "./entity.ts";

export abstract class System {
  protected constructor(
    protected priority: number = 0,
    protected components: Component[] = [],
  ) {}

  private _engine: Engine | null = null;

  get engine(): Engine | null {
    return this._engine;
  }

  set engine(engine: Engine | null): void {
    this._engine = engine;
  }

  private _updating = false;

  get updating(): boolean {
    return this._updating;
  }

  private _active = false;

  get active(): boolean {
    return this._active;
  }

  onAddedToEngine(engine: Engine) {}
}

export abstract class AbstractEntitySystem<T extends Entity = Entity> extends System {
  protected constructor(
    protected priority: number = 0,
    protected components: Component[],
  ) {
    super(priority, components);
  }

  processEntity(entity: Entity): void {}
}

export class EntitySystemCollection<T extends System = System> extends Collection<T> {
  constructor(private engine: Engine | null = null) {
    super();
  }
}
