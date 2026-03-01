export class Collection<T = any> {
  constructor(private _items: T[] = []) {}

  get all() {
    return this._items;
  }

  add(item: T) {
    this._items.push(item);
  }
}
