/* eslint-disable @typescript-eslint/no-unsafe-function-type */

import { Engine } from "./engine.ts";
import { AbstractEntity } from "./entity.ts";

export abstract class AbstractSystem<T = any> {
  constructor(private priority: number = 0) {}

  public _engine: Engine | null = null;

  get engine(): Engine | null {
    return this._engine;
  }

  set engine(engine: Engine | null) {
    if (engine) {
      this._engine = engine;
    }
  }

  public abstract update(entities: Set<AbstractEntity>): void;
  abstract process(options: T): void;

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
