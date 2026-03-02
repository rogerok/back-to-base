/* eslint-disable @typescript-eslint/no-unsafe-function-type */

import { Engine } from "./engine.ts";
import { AbstractEntity } from "./entity.ts";

export interface SystemListener {
  onAddedToEngine?: (engine: Engine) => void;
}

export abstract class AbstractSystem<T = any, L extends SystemListener = SystemListener> {
  constructor(private priority: number = 0) {}

  public _engine: Engine | null = null;

  get engine(): Engine | null {
    return this._engine;
  }

  public abstract update?:(entities: Set<AbstractEntity>): void;

  abstract process(options: T): void;

  setEngine(engine: Engine | null) {
    if (engine) {
      this._engine = engine;
    }
  }

  onAddedToEngine(engine: Engine) {}

  run(options: T) {
    this.process(options);
  }
}

export abstract class AbstractEntitySystem<
  T extends AbstractEntity = AbstractEntity,
> extends AbstractSystem {
  public components: Set<Function> = new Set<Function>();

  constructor(priority: number = 0, components: Function[]) {
    super(priority);
    components.forEach((c) => this.components.add(c));
  }

  abstract processEntity(entity: T): void;
}

export class EntitySystemCollection<T extends AbstractSystem = AbstractSystem> {
  // extends Collection<T>

  vals = new Set<AbstractSystem>();

  constructor(private engine: Engine) {}

  add(system: AbstractSystem) {
    this.vals.add(system);
  }
}
