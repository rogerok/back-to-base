import { Entity } from "./entity.ts";
import { Engine } from "./index.ts";

export class System<T extends Entity = Entity> {
  engine: Engine | null = null;

  private _updating = false;

  get updating(): boolean {
    return this._updating;
  }

  private _active = false;

  get active(): boolean {
    return this._active;
  }

  setEngine(engine: Engine): void {
    this.engine = engine;
  }
}
