import { Collection } from "./collection.ts";
import { Class } from "./types.ts";

export interface Component extends Record<string, any> {
  id?: string;
}

export interface ComponentClass<T extends Component> extends Class<T> {
  readonly id?: string;
}

export class ComponentsCollection<Comp extends Component = Component> extends Collection<Comp> {
  // private map = new Map<ComponentClass<Comp>, Comp[]>();

  constructor(elements: Comp[] = []) {
    super(elements);
  }
  //
  // updateMap = (cls: ComponentClass<Comp>) => {
  //   const filtered = this.all.filter((el) => (el.constructor as ComponentClass<Comp>) === cls);
  //
  //   this.map.set(cls, filtered);
  // };

  // addComp = (...elements: Comp[]) => {
  //   elements.forEach((el) =>
  //     this.map.set(el.constructor as ComponentClass<Comp>, [
  //       el,
  //       ...this.map.get(el.constructor as ComponentClass<Comp>),
  //     ]),
  //   );
  // };

  /*  get = <T extends Comp>(cls: Class<T>): T => {
    return this.map.get(cls) as T;
  };*/
  //
  // delete = <T extends Component>(val: Class<T>) => {
  //   this.map.delete(val);
  // };

  get<T extends Comp>(cls: ComponentClass<T>): T {
    return this.all.filter((c) => c.constructor === cls)[0] as T;
  }
}
