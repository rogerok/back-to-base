import { AbstractSystem } from "../../ecs-2/system.ts";
import { Collection } from "./collection.ts";
import { AbstractEntity, EntitiesCollection } from "./entity.ts";

export class Engine<T extends AbstractEntity = AbstractEntity> {
  systems = new Collection<AbstractSystem>();
  entities = new EntitiesCollection();

  run<Options>(options?: Options) {
    this.systems.all.forEach((system) => {
      system.run(options);
    });
  }
}
