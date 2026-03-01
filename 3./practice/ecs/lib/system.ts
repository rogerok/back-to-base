import { Collection } from "./collection.ts";
import { Component, ComponentClass } from "./component.ts";
import { Engine } from "./engine.ts";
import { AbstractEntity } from "./entity.ts";

type Comp = Component | ComponentClass<Component>;

export abstract class System<T = any> {
  protected constructor(protected priority: number = 0) {}

  private _engine: Engine | null = null;

  get engine(): Engine | null {
    return this._engine;
  }

  set engine(engine: Engine | null) {
    this._engine = engine;
    if (engine) {
      this.onAddedToEngine(engine);
    }
  }

  onAddedToEngine(engine: Engine): void {}

  abstract process(options: T): void;

  run(options: T) {
    this.process(options);
  }
}

export abstract class AbstractEntitySystem<
  T extends AbstractEntity = AbstractEntity,
> extends System {
  protected constructor(
    protected priority = 0,
    protected components: Comp[] = [],
  ) {
    super(priority);
  }

  process = <Options>(options?: Options) => {
    const entities = this.engine?.entities.all;

    if (!entities?.length) return;

    this.engine?.entities.all.forEach((entity, idx) => {
      this.processEntity(<T>entity, idx, <T[]>entities, options);
    });
  };

  abstract processEntity<Options>(
    entity: T,
    index?: number,
    entities?: T[],
    options?: Options,
  ): void;
}

export class EntitySystemCollection<T extends System = System> extends Collection<T> {
  constructor(private engine: Engine | null = null) {
    super();
  }
}
