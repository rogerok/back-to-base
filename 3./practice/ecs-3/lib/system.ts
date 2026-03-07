import { Aspect } from "./aspect.ts";
import { Component } from "./component.ts";
import { Dispatcher } from "./dispatcher.ts";
import { Engine } from "./engine.ts";
import { Entity } from "./entity.ts";
import { ComponentClass } from "./types.ts";

export interface SystemListener {
  onActivated: () => void;
  onAddedToEngine: (engine: Engine) => void;
  onDeactivated: () => void;
  onError: (error: Error) => void;
  onRemovedFromEngine: (engine: Engine) => void;
}

export abstract class System<
  L extends SystemListener = SystemListener,
  T = any,
> extends Dispatcher<L> {
  aspect?: Aspect;
  // @ts-ignore
  private _engine: Engine | null = null;

  constructor(public priority: number = 0) {
    super();
  }

  onAddedToEngine(engine: Engine) {
    this._engine = engine;
  }

  onRemovedFromEngine() {
    this._engine = null;
  }

  abstract process(options: T): void;
}

type CompType = ComponentClass<Component>;

export abstract class AbstractEntitySystem<E extends Entity = Entity> extends System {
  constructor(
    priority: number = 0,
    private componentTypes: CompType[],
  ) {
    super(priority);
  }

  onAddedToEngine(engine: Engine) {
    super.onAddedToEngine(engine);
    this.aspect = Aspect.for(engine).all(...this.componentTypes);
  }

  process = (delta: number) => {
    this.aspect?.entities.forEach((entity) => {
      this.processEntity(entity as E, delta);
    });
  };

  abstract processEntity(entity: E, delta?: number): void;
}
