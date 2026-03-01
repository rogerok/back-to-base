import { AbstractEntity, EntitiesCollection } from "./entity.ts";
import { EntitySystemCollection } from "./system.ts";

export class Engine<T extends AbstractEntity = AbstractEntity> {
  systems = new EntitySystemCollection(this);
  entities = new EntitiesCollection();

  run<Options>(options?: Options) {
    this.systems.all.forEach((system) => {
      system.run(options);
    });
  }
}
