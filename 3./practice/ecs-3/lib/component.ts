import { Collection, CollectionListener } from "./collection.ts";
import { Class } from "./types.ts";

export interface Component extends Record<string, any> {
  id?: string;
}

export interface ComponentClass<T extends Component> extends Class<T> {
  readonly id?: string;
}

export class ComponentCollection<C extends Component = Component>
  extends Collection<C>
  implements CollectionListener<C>
{
  components = new Map<ComponentClass<C>, readonly C[]>();

  constructor(items: C[] = []) {
    super(items);
    // for what?
    // @ts-ignore
    this.addListener(this);
  }

  onAdded = (...items: C[]): void => {
    items.forEach((item) => {
      const cls = item.constructor as ComponentClass<C>;

      this.components.set(cls, [...(this.components.get(cls) ?? []), item]);
    });
  };

  get = <T extends C>(cls: ComponentClass<T>): T => {
    return this.getAll(cls)[0];
  };

  getAll = <T extends C>(cls: ComponentClass<T>): readonly T[] => {
    const c = this.components.get(cls);

    return c ? (c as T[]) : [];
  };

  onCleared = (): void => {
    this.components.clear();
  };
}
