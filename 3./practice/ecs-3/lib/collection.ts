import { Dispatcher } from "./dispatcher.ts";

export interface CollectionListener<T> {
  onAdded?: (...elements: T[]) => void;
  onCleared?: () => void;
  onRemoved?: (...elements: T[]) => void;
}

export class Collection<T> extends Dispatcher<CollectionListener<T>> {
  constructor(private items: Set<T> = new Set<T>()) {
    super();
  }

  get elements(): Set<T> {
    return this.items;
  }

  addOne(element: T): boolean {
    if (this.elements.has(element)) {
      return false;
    }

    this.items.add(element);
    return true;
  }

  addMany(...elements: T[]): boolean {
    const added = elements.filter((e) => this.addOne(e));

    if (!added.length) {
      return false;
    }

    this.dispatch("onAdded", ...added);

    return true;
  }

  removeOne(element: T): boolean {
    if (!this.elements.has(element)) {
      return false;
    }
    this.items.delete(element);

    return true;
  }

  removeMany(...elements: T[]): boolean {
    const removed = elements.filter((e) => this.removeOne(e));

    this.dispatch("onRemoved", ...removed);

    return true;
  }

  clear(): void {
    this.items.clear();
    this.dispatch("onCleared");
  }
}
