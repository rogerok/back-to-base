export type ArgumentTypes<F> = F extends (...args: infer A) => unknown ? A : never;

export abstract class Dispatcher<T> {
  listeners = new Set<Partial<T>>();

  addListener = (listener: Partial<T>): void => {
    if (!this.listeners.has(listener)) {
      this.listeners.add(listener);
    }
  };

  removeListener = (listener: Partial<T>): void => {
    if (this.listeners.has(listener)) {
      this.listeners.delete(listener);
    }
  };

  dispatch = <Key extends keyof T>(name: Key, ...args: ArgumentTypes<T[Key]>): void => {
    this.listeners.forEach((listener) => {
      const fn = listener[name];

      if (typeof fn === "function") {
        fn.apply(listener, args);
      }
    });
  };
}
