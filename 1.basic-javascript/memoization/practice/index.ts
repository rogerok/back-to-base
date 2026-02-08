type Callback<Args, Return> = (...args: Args[]) => Return;

export function memoize<Args, Return>(cb: Callback<Args, Return>): Callback<Args, Return> {
  const cache: Record<string, Return> = {};

  const wrapper: Callback<Args, Return> = (...args: Args[]): Return => {
    const argKeys = String(args);

    if (argKeys in cache) {
      return cache[argKeys];
    } else {
      const callResult = cb(...args);
      cache[argKeys] = callResult;
      return callResult;
    }
  };

  return wrapper;
}
