import { Collection } from "./collection.ts";
import { Class } from "./types.ts";

export interface Component extends Record<string, any> {
  id?: string;
}

export class ComponentCollectiom<C extends Component = Component> extends Collection<C> {
  items = new Map<Class<C>, >();

  getOne(c: C) {}
}
