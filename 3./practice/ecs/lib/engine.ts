import { EntitiesCollection } from "./entity.ts";
import { EntitySystemCollection } from "./system.ts";

export class Engine {
  systems = new EntitySystemCollection(this);
  entities = new EntitiesCollection();
}
