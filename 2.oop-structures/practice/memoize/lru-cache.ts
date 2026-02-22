export interface LruCacheOptions {
  maxSize: number;
}

interface CacheValue<V> {
  value: V;
}

// TODO in cache replace with list
export class LRUCache<K, V> {
  private cache = new Map<K, CacheValue<V>>();
  private readonly maxSize: number;

  constructor(options: LruCacheOptions) {
    if (options.maxSize <= 0) {
      throw new Error("maxSize must be greater than 0");
    }

    this.maxSize = options.maxSize;
  }

  clearCache(): void {
    this.cache.clear();
  }

  get(key: K): V | undefined {
    const item = this.cache.get(key);

    if (!item) return undefined;

    this.reorder(key);

    return item.value;
  }

  delete(key: K): boolean {
    return this.cache.delete(key);
  }

  set(key: K, value: V): void {
    if (this.cache.has(key)) {
      this.delete(key);
    } else if (this.cache.size >= this.maxSize) {
      const oldestKey = this.cache.keys().next().value;

      if (oldestKey !== undefined) {
        this.delete(oldestKey);
      }
    }

    this.cache.set(key, {
      value: value,
    });
  }

  private reorder(key: K): void {
    const item = this.cache.get(key);
    if (!item) return;

    this.delete(key);
    this.cache.set(key, item);
  }
}
