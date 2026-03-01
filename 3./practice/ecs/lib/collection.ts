export class Collection<T = any> {
  constructor(private _items: T[] = []) {}

  get all() {
    return this._items;
  }

  // add(item: T) {
  //   if (!this._items.includes(item)) {
  //     this._items.push(item);
  //   }
  // }
  add(...items: T[]) {
    this._items.push(...items);
  }
}
