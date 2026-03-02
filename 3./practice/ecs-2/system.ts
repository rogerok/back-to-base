/* eslint-disable @typescript-eslint/no-unsafe-function-type */

import { Engine } from "./engine.ts";
import { AbstractEntity } from "./entity.ts";

export abstract class AbstractSystem {
  public abstract components: Set<Function>;
  public engine: Engine;

  public abstract update(entities: Set<AbstractEntity>): void;
}
