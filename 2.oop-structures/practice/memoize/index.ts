import { LRUCache } from "./lru-cache.ts";

type Callback<Args extends unknown[], Return> = (...args: Args) => Return;

const DEFAULT_SIZE = 2;

export function memoize<Args extends unknown[], Return>(
  cb: (...args: Args) => Return,
  cacheSize: number = DEFAULT_SIZE,
): { clear(): void } & Callback<Args, Return> {
  const cache: LRUCache<string, Return> = new LRUCache({
    maxSize: cacheSize,
  });

  function wrapper(...args: Args): Return {
    const argKeys = String(args);
    const value = cache.get(argKeys);
    if (value !== undefined) {
      return value;
    } else {
      const callResult = cb(...args);
      cache.set(argKeys, callResult);
      return callResult;
    }
  }

  wrapper.clear = function clear() {
    cache.clearCache();
  };

  wrapper.clear();

  return wrapper;
}
