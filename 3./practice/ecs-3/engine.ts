import { ComponentContainer } from "./component.ts";
import { AbstractEntity } from "./entity.ts";
import { EntitySystemCollection } from "./system.ts";

export class Engine {
  entities = new Map<AbstractEntity, ComponentContainer>();
  systems = new EntitySystemCollection(this);
}

const engine = new Engine();
