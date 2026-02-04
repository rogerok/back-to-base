type Callback<Args, Return> = (...args: Args[]) => Return;

export function memoize<Args, Return>(cb: Callback<Args, Return>): Callback<Args, Return> {
  const cache: Record<string, Return | null> = {};

  const wrapper: Callback<Args, Return> | null = (...args: Args[]): Return => {
    const argKeys = String(args);

    if (argKeys in cache && cache[argKeys]) {
      return cache[argKeys];
    } else {
      const callResult = cb(...args);
      cache[argKeys] = callResult;
      return callResult;
    }
  };

  return wrapper;
}
