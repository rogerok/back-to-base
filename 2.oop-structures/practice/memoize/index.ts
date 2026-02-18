import { LRUCache } from "./lru-cache.ts";

type Callback<Args, Return> = (...args: Args[]) => Return;

const DEFAULT_SIZE = 10;

export function memoize<Args, Return>(cb: Callback<Args, Return>): Callback<Args, Return> {
  const cache: LRUCache<string, Return> = new LRUCache({
    maxSize: DEFAULT_SIZE,
  });

  const wrapper: Callback<Args, Return> = (...args: Args[]): Return => {
    const argKeys = String(args);
    const value = cache.get(argKeys);
    if (value) {
      return value;
    } else {
      const callResult = cb(...args);
      cache.set(argKeys, callResult);
      return callResult;
    }
  };

  return wrapper;
}
