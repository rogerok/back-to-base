import { Dispatcher } from "./dispatcher.ts";

export interface CollectionListener<T> {
  onAdded?: (...elements: T[]) => void;
  onCleared?: () => void;
  onRemoved?: (...elements: T[]) => void;
}

export class Collection<T> extends Dispatcher<CollectionListener<T>> {
  private map = new Map<T, number>();

  constructor(elements: T[] = []) {
    super();
    this.add(...elements);
  }

  private _elements: T[] = [];

  get elements(): T[] {
    return this._elements;
  }

  addOne(element: T): boolean {
    if (this.map.has(element)) {
      return false;
    }

    this.map.set(element, this._elements.length);
    this._elements.push(element);

    return true;
  }

  has(element: T): boolean {
    return this.map.has(element);
  }

  getOne(element: T): T {
    const i = this.map.get(element);

    if (i === undefined) {
      throw new Error(`Cannot find element with element ${String(element)}`);
    }

    return this._elements[i];
  }

  add(...elements: T[]): boolean {
    const added = elements.filter((e) => this.addOne(e));

    if (!added.length) {
      return false;
    }

    this.dispatch("onAdded", ...added);

    return true;
  }

  removeOne(element: T): boolean {
    const i = this.map.get(element);

    if (i === undefined) {
      return false;
    }

    this.map.delete(element);
    this._elements.splice(i, 1);

    for (let j = i; j < this._elements.length; j++) {
      this.map.set(this._elements[j], j);
    }

    return true;
  }

  remove(...elements: T[]): boolean {
    const removed = elements.filter((e) => this.removeOne(e));

    this.dispatch("onRemoved", ...removed);

    return true;
  }

  clear(): void {
    this._elements = [];
    this.map = new Map();
    this.dispatch("onCleared");
  }
}
