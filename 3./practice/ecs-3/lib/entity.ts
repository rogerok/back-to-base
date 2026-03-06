import { Collection, CollectionListener } from "./collection.ts";
import { Component, ComponentCollection } from "./component.ts";
import { Dispatcher } from "./dispatcher.ts";

export interface EntityListener<C extends Component = Component> {
  onAddedComponents?: (...elements: C[]) => void;

  onClearedComponents?: () => void;

  onRemovedComponents?: (...elements: C[]) => void;
}

export abstract class Entity<
  C extends Component = Component,
  L extends EntityListener<C> = EntityListener<C>,
>
  extends Dispatcher<L>
  implements CollectionListener<C>
{
  constructor(private id?: string) {
    super();

    this._components.addListener(this);
  }

  private _components: ComponentCollection<C> = new ComponentCollection();

  get components(): ComponentCollection<C> {
    return this._components;
  }

  onAdded(...components: C[]): void {
    (<Dispatcher<EntityListener>>(<unknown>this)).dispatch("onAddedComponents", ...components);
  }

  onRemoved(...components: C[]): void {
    (<Dispatcher<EntityListener>>(<unknown>this)).dispatch("onRemovedComponents", ...components);
  }

  onCleared(): void {
    (<Dispatcher<EntityListener>>(<unknown>this)).dispatch("onClearedComponents");
  }
}

export class EntityCollection<T extends Entity = Entity>
  extends Collection<T>
  implements CollectionListener<T>
{
  constructor(...args: any[]) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    super(...args);
    // @ts-ignore
    this.addListener(this);
  }
}
