import { Component, ComponentClass, ComponentContainer } from "./component.ts";
import { AbstractEntity } from "./entity.ts";

export class Aspect {
  entity: AbstractEntity;

  components: ComponentContainer;

  setCompContainer(cc: ComponentContainer): void {
    this.components = cc;
  }

  get<T extends Component>(c: ComponentClass<T>): T {
    return this.components.get(c);
  }

  // eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
  public has(...cs: Function[]): boolean {
    for (const c of cs) {
      if (!this.components.has(c)) {
        return false;
      }
    }
    return true;
  }
}
