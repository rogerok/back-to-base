import { Collection } from "./collection.ts";
import { EntityCollection } from "./entity.ts";
import { System } from "./system.ts";

export class Engine {
  entities = new EntityCollection();
  systems = new Collection<System>();

  constructor() {
    this.systems.addListener({
      onAdded: (...systems: System[]) => {
        systems.forEach((system) => {
          system.onAddedToEngine(this);
        });
      },
      onRemoved: (...systems: System[]) => {
        systems.forEach((system) => {
          system.onRemovedFromEngine();
        });
      },
    });
  }

  run = (delta: number): void => {
    this.systems.elements.forEach((system) => {
      system.process(delta);
    });
  };
}
