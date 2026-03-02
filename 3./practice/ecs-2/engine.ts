import { ComponentContainer } from "./component.ts";
import { AbstractEntity } from "./entity.ts";
import { AbstractSystem } from "./system.ts";

export class Engine {
  entities = new Map<AbstractEntity, ComponentContainer>();
  systems = new Map<AbstractSystem, Set<AbstractEntity>>();
}

const engine = new Engine();
